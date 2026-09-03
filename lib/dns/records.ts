import type { DnsCheck, DnsRecord } from "@/lib/mail/types";

export const REQUIRED_DNS_RECORD_KINDS = ["mx", "spf", "dkim", "dmarc"] as const;

export type RequiredDnsRecordKind = (typeof REQUIRED_DNS_RECORD_KINDS)[number];

function normalizeHost(value: string) {
  return value.trim().replace(/\.$/, "").toLowerCase();
}

export function relativeDnsHost(host: string, domain: string) {
  const normalizedHost = normalizeHost(host);
  const apex = normalizeHost(domain);

  if (normalizedHost === apex) return "@";
  if (normalizedHost.endsWith(`.${apex}`)) {
    return normalizedHost.slice(0, -(apex.length + 1));
  }
  return normalizedHost;
}

function dkimKeyType(value: string) {
  const match = value.match(/(?:^|;)\s*k\s*=\s*([^;]*)/);
  return match ? match[1].trim() : "rsa";
}

function isRequiredKind(
  record: DnsRecord,
  domain: string,
  kind: RequiredDnsRecordKind,
) {
  const host = normalizeHost(record.host);
  const apex = normalizeHost(domain);
  const value = record.value.trim().toLowerCase();

  switch (kind) {
    case "mx":
      return record.type === "MX" && host === apex;
    case "spf":
      return record.type === "TXT" && host === apex && value.startsWith("v=spf1");
    case "dkim":
      return (
        record.type === "TXT" &&
        host.endsWith(`._domainkey.${apex}`) &&
        value.startsWith("v=dkim1") &&
        dkimKeyType(value) === "rsa"
      );
    case "dmarc":
      return (
        record.type === "TXT" &&
        host === `_dmarc.${apex}` &&
        value.startsWith("v=dmarc1")
      );
  }
}

export function partitionDnsRecords<T extends DnsRecord>(records: T[], domain: string) {
  const isManagedProviderZone = records.some(
    (record) =>
      record.type === "CNAME" &&
      normalizeHost(record.host).includes("._domainkey"),
  );
  if (isManagedProviderZone) {
    return { required: records, advanced: [], missingRequired: [] };
  }
  const selected = new Set<number>();
  const required: T[] = [];
  const missingRequired: RequiredDnsRecordKind[] = [];

  for (const kind of REQUIRED_DNS_RECORD_KINDS) {
    const matches = records.flatMap((record, recordIndex) =>
      !selected.has(recordIndex) && isRequiredKind(record, domain, kind)
        ? [recordIndex]
        : [],
    );
    if (matches.length === 0) {
      missingRequired.push(kind);
    } else {
      for (const index of matches) {
        selected.add(index);
        required.push(records[index]);
      }
    }
  }

  return {
    required,
    advanced: records.filter((_, index) => !selected.has(index)),
    missingRequired,
  };
}

export function summarizeRequiredDnsChecks(checks: DnsCheck[], domain: string) {
  const partitioned = partitionDnsRecords(checks, domain);
  const okCount = partitioned.required.filter((record) => record.ok).length;

  return {
    ...partitioned,
    okCount,
    ready:
      partitioned.missingRequired.length === 0 &&
      okCount === partitioned.required.length,
  };
}
