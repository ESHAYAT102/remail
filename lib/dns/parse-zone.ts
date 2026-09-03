import type { DnsRecord } from "@/lib/mail/types";

const LINE =
  /^(\S+)\s+(?:\d+\s+)?IN\s+(MX|TXT|CNAME|A|AAAA)\s+(?:(\d+)\s+)?(.+)$/i;

function logicalLines(zone: string) {
  const lines: string[] = [];
  let current = "";
  let parentheses = 0;

  for (const raw of zone.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("$")) continue;

    current = current ? `${current} ${line}` : line;
    parentheses += (line.match(/\(/g) ?? []).length;
    parentheses -= (line.match(/\)/g) ?? []).length;

    if (parentheses <= 0) {
      lines.push(current);
      current = "";
      parentheses = 0;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function parseValue(type: DnsRecord["type"], rest: string) {
  let value = rest.trim();
  if (value.startsWith("(") && value.endsWith(")")) {
    value = value.slice(1, -1).trim();
  }

  if (type === "TXT") {
    const chunks = [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)];
    if (chunks.length) {
      return chunks
        .map((chunk) => chunk[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
        .join("");
    }
  }

  return value.replace(/^"|"$/g, "").replace(/\.$/, "");
}

export function parseZoneFile(zone: string): DnsRecord[] {
  const records: DnsRecord[] = [];

  for (const line of logicalLines(zone)) {
    const match = line.match(LINE);
    if (!match) continue;

    const [, host, type, priority, rest] = match;
    const recordType = type.toUpperCase() as DnsRecord["type"];

    records.push({
      type: recordType,
      host: host.replace(/\.$/, ""),
      value: parseValue(recordType, rest),
      priority: priority ? Number(priority) : undefined,
    });
  }

  return records;
}

export function synthesizeZone(domain: string, mailHost: string): string {
  return [
    `${domain}. IN MX 10 ${mailHost}.`,
    `${domain}. IN TXT "v=spf1 mx -all"`,
    `default._domainkey.${domain}. IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0demo"`,
    `_dmarc.${domain}. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"`,
  ].join("\n");
}
