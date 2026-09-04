type StoredAddress = { email?: string };

type ThreadCandidate = {
  threadId: string;
  subject: string;
  from: unknown;
  to: unknown;
  cc: unknown;
  bcc: unknown;
  replyTo: unknown;
};

function header(headers: Record<string, unknown> | null | undefined, name: string) {
  const key = Object.keys(headers ?? {}).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  const value = key ? headers?.[key] : undefined;
  return typeof value === "string" ? value : "";
}

export function normalizeMessageId(value: string) {
  return value.trim().replace(/^<|>$/g, "").toLowerCase();
}

export function referencedMessageIds(
  headers: Record<string, unknown> | null | undefined,
) {
  const values = [header(headers, "in-reply-to"), header(headers, "references")];
  const ids = values.flatMap((value) => {
    const bracketed = value.match(/<[^>]+>/g);
    return bracketed ?? value.split(/[\s,]+/);
  });
  return [...new Set(ids.map(normalizeMessageId).filter(Boolean))];
}

export function normalizedThreadSubject(subject: string) {
  return subject
    .replace(/^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

function addressEmails(value: unknown) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const email = (entry as StoredAddress).email?.trim().toLowerCase();
    return email ? [email] : [];
  });
}

/**
 * Resend's send response does not expose the final SMTP Message-ID. For an
 * incoming `Re:` without a resolvable reference, use the latest conversation
 * with the same subject only when the sender was already a participant.
 */
export function fallbackReplyThread(
  subject: string,
  sender: string,
  candidates: readonly ThreadCandidate[],
) {
  if (!/^\s*re\s*:/i.test(subject)) return null;
  const wantedSubject = normalizedThreadSubject(subject);
  const wantedSender = sender.trim().toLowerCase();
  return (
    candidates.find((candidate) => {
      if (normalizedThreadSubject(candidate.subject) !== wantedSubject) return false;
      const participants = [
        ...addressEmails(candidate.from),
        ...addressEmails(candidate.to),
        ...addressEmails(candidate.cc),
        ...addressEmails(candidate.bcc),
        ...addressEmails(candidate.replyTo),
      ];
      return participants.includes(wantedSender);
    })?.threadId ?? null
  );
}
