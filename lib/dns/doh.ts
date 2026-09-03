import type { DnsCheck, DnsRecord } from "@/lib/mail/types";

type DoHAnswer = {
  name: string;
  type: number;
  data: string;
};

const TYPE_NUM: Record<DnsRecord["type"], number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
};

const SPF_POLICY = /^v=spf1(?:\s|$)/;
const DMARC_POLICY = /^v=dmarc1(?:;|\s|$)/;

function normalize(value: string) {
  const chunks = [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)];
  const unquoted = chunks.length
    ? chunks
        .map((chunk) => chunk[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
        .join("")
    : value;

  return unquoted
    .replace(/\\"/g, '"')
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function lookupDoH(host: string, type: DnsRecord["type"]) {
  const url = new URL("https://cloudflare-dns.com/dns-query");
  url.searchParams.set("name", host);
  url.searchParams.set("type", type);

  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];
  const json = (await res.json()) as { Answer?: DoHAnswer[] };
  return (json.Answer ?? [])
    .filter((a) => a.type === TYPE_NUM[type])
    .map((a) => a.data);
}

function matchingAnswer(record: DnsRecord, answers: string[]) {
  const expected = normalize(record.value);
  return answers.find((answer) => {
    const observed = normalize(answer);
    return (
      observed === expected ||
      (record.type === "MX" && observed.endsWith(` ${expected}`))
    );
  });
}

function relatedAnswer(record: DnsRecord, answers: string[]) {
  if (record.type !== "TXT") return answers[0];
  const expectedTag = normalize(record.value).match(/^v=([^;\s]+)/)?.[0];
  if (!expectedTag) return answers[0];
  return answers.find((answer) => normalize(answer).startsWith(expectedTag));
}

function policyConflict(record: DnsRecord, answers: string[]) {
  if (record.type !== "TXT") return null;

  const expected = normalize(record.value);
  const conflict = SPF_POLICY.test(expected)
    ? ("spf" as const)
    : DMARC_POLICY.test(expected)
      ? ("dmarc" as const)
      : null;
  if (!conflict) return null;

  const policy = conflict === "spf" ? SPF_POLICY : DMARC_POLICY;
  const observed = answers.filter((answer) => policy.test(normalize(answer)));
  return observed.length > 1 ? { conflict, observed } : null;
}

function doubledHost(host: string, domain: string) {
  const normalizedHost = host.trim().replace(/\.$/, "").toLowerCase();
  const apex = domain.trim().replace(/\.$/, "").toLowerCase();
  if (normalizedHost !== apex && !normalizedHost.endsWith(`.${apex}`)) return null;
  return `${normalizedHost}.${apex}`;
}

export async function verifyRecords(
  records: DnsRecord[],
  domain: string,
): Promise<DnsCheck[]> {
  return Promise.all(
    records.map(async (record) => {
      try {
        const answers = await lookupDoH(record.host, record.type);
        const conflicting = policyConflict(record, answers);
        if (conflicting) {
          return {
            ...record,
            ok: false,
            observed: conflicting.observed.join(" | "),
            observedHost: record.host,
            conflict: conflicting.conflict,
          };
        }

        const match = matchingAnswer(record, answers);
        if (match) return { ...record, ok: true, observed: match };

        const wrongHost = doubledHost(record.host, domain);
        if (wrongHost) {
          const wrongHostAnswers = await lookupDoH(wrongHost, record.type);
          const wrongHostMatch = matchingAnswer(record, wrongHostAnswers);
          if (wrongHostMatch) {
            return {
              ...record,
              ok: false,
              observed: wrongHostMatch,
              observedHost: wrongHost,
              mismatch: "host" as const,
            };
          }
          if (wrongHostAnswers[0]) {
            return {
              ...record,
              ok: false,
              observed: wrongHostAnswers[0],
              observedHost: wrongHost,
              mismatch: "host-and-value" as const,
            };
          }
        }

        const related = relatedAnswer(record, answers);
        return {
          ...record,
          ok: false,
          observed: related,
          observedHost: related ? record.host : undefined,
          mismatch: related ? ("value" as const) : undefined,
        };
      } catch {
        return { ...record, ok: false };
      }
    }),
  );
}
