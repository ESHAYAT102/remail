import type { ComposeInput } from "./types";

export const REDAKT_FOOTER_TEXT = "Sent from Remail";

export function emptyComposeInput(includeRedaktFooter: boolean): ComposeInput {
  return {
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    text: includeRedaktFooter ? `\n\n${REDAKT_FOOTER_TEXT}` : "",
  };
}

export function addRedaktFooter(text: string, includeRedaktFooter: boolean) {
  if (!includeRedaktFooter) return text;
  return `${text.replace(/\s+$/, "")}\n\n${REDAKT_FOOTER_TEXT}`;
}

export function hasAuthoredComposeText(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return false;
  if (normalized === REDAKT_FOOTER_TEXT) return false;
  return true;
}

export function hasAuthoredComposeContent({
  text,
  html,
}: Pick<ComposeInput, "text" | "html">) {
  if (hasAuthoredComposeText(text)) return true;
  if (!html?.trim()) return false;

  const visibleText = html
    .replace(/<(?:head|style)[^>]*>[\s\S]*?<\/(?:head|style)>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:blockquote|div|h[1-6]|li|p|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;|&#x0*22;/gi, '"')
    .replace(/&#39;|&#x0*27;|&apos;/gi, "'")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (visibleText && visibleText !== REDAKT_FOOTER_TEXT) return true;
  return /<(?:audio|hr|img|table|video)\b/i.test(html);
}
