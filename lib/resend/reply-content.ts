const WROTE_LINE = /^On .+wrote:\s*$/i;

/** Remove the trailing quote that mail clients append beneath a reply. */
export function stripPlainTextReplyHistory(value?: string | null) {
  if (!value) return value ?? undefined;
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const wroteAt = lines.findIndex((line) => WROTE_LINE.test(line.trim()));
  if (wroteAt >= 0) return lines.slice(0, wroteAt).join("\n").trimEnd();

  const quoteAt = lines.findIndex(
    (line, index) =>
      line.trimStart().startsWith(">") &&
      lines.slice(index).some((candidate) => candidate.trimStart().startsWith(">")),
  );
  return (quoteAt >= 0 ? lines.slice(0, quoteAt) : lines).join("\n").trimEnd();
}

/**
 * Gmail wraps reply history in `gmail_quote`; several other clients use a
 * trailing blockquote. The quote is conventionally the final HTML fragment,
 * so truncating at its opening tag avoids brittle nested-tag parsing.
 */
export function stripHtmlReplyHistory(value?: string | null) {
  if (!value) return value ?? undefined;
  const gmailQuote = value.search(
    /<div\b[^>]*class=["'][^"']*\bgmail_quote(?:_container)?\b[^"']*["'][^>]*>/i,
  );
  if (gmailQuote >= 0) return value.slice(0, gmailQuote).trimEnd();

  const blockquote = value.search(/<blockquote\b[^>]*>/i);
  return (blockquote >= 0 ? value.slice(0, blockquote) : value).trimEnd();
}
