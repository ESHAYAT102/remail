export const commonSenderAliases = [
  "hello",
  "contact",
  "help",
  "info",
  "support",
] as const;

const senderAliasPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

export function normalizeSenderAlias(value: string) {
  return value.trim().toLowerCase();
}

export function isValidSenderAlias(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64 &&
    senderAliasPattern.test(value)
  );
}

function fuzzyScore(candidate: string, query: string) {
  if (!query) return 4;
  if (candidate === query) return 0;
  if (candidate.startsWith(query)) return 1;
  if (candidate.includes(query)) return 2;

  let queryIndex = 0;
  for (const character of candidate) {
    if (character === query[queryIndex]) queryIndex += 1;
  }
  return queryIndex === query.length ? 3 : -1;
}

export function fuzzySenderAliases(query: string) {
  const normalized = normalizeSenderAlias(query);
  return commonSenderAliases
    .map((alias, index) => ({ alias, index, score: fuzzyScore(alias, normalized) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((item) => item.alias);
}
