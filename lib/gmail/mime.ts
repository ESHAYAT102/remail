import type { ComposeAttachment, ComposeInput } from "@/lib/mail/types";

function safeHeader(value?: string) {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function encodedHeader(value: string) {
  const safe = safeHeader(value);
  return /^[\x20-\x7E]*$/.test(safe)
    ? safe
    : `=?UTF-8?B?${Buffer.from(safe).toString("base64")}?=`;
}

function wrappedBase64(value: string) {
  return value.replace(/\s/g, "").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function attachmentPart(boundary: string, attachment: ComposeAttachment) {
  return [
    `--${boundary}`,
    `Content-Type: ${safeHeader(attachment.mimeType) || "application/octet-stream"}`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeHeader(attachment.filename).replace(/"/g, "'")}"`,
    "",
    wrappedBase64(attachment.data),
  ].join("\r\n");
}

function bodyPart(boundary: string, mimeType: "text/plain" | "text/html", value: string) {
  return [
    `--${boundary}`,
    `Content-Type: ${mimeType}; charset=UTF-8`,
    "Content-Transfer-Encoding: 8bit",
    "",
    value.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
}

function alternativeBody(boundary: string, input: ComposeInput) {
  return [
    bodyPart(boundary, "text/plain", input.text),
    bodyPart(boundary, "text/html", input.html ?? ""),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export function buildGmailRawMessage(
  from: { name: string; email: string },
  input: ComposeInput,
  reply?: { messageId?: string; references?: string; threadId?: string },
) {
  const fromHeader = safeHeader(from.name)
    ? `${encodedHeader(from.name)} <${safeHeader(from.email)}>`
    : safeHeader(from.email);
  const headers = [
    `From: ${fromHeader}`,
    `To: ${safeHeader(input.to)}`,
    ...(input.cc ? [`Cc: ${safeHeader(input.cc)}`] : []),
    ...(input.bcc ? [`Bcc: ${safeHeader(input.bcc)}`] : []),
    `Subject: ${encodedHeader(input.subject)}`,
    "MIME-Version: 1.0",
  ];
  if (reply?.messageId) headers.push(`In-Reply-To: ${safeHeader(reply.messageId)}`);
  if (reply?.references) headers.push(`References: ${safeHeader(reply.references)}`);

  const attachments = input.attachments ?? [];
  const hasHtml = Boolean(input.html);
  let source: string;
  if (attachments.length === 0 && !hasHtml) {
    source = [
      ...headers,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      input.text.replace(/\r?\n/g, "\r\n"),
    ].join("\r\n");
  } else if (attachments.length === 0) {
    const boundary = `redakt_alt_${crypto.randomUUID().replace(/-/g, "")}`;
    source = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      alternativeBody(boundary, input),
    ].join("\r\n");
  } else {
    const boundary = `redakt_${crypto.randomUUID().replace(/-/g, "")}`;
    const alternativeBoundary = hasHtml
      ? `redakt_alt_${crypto.randomUUID().replace(/-/g, "")}`
      : null;
    const body = alternativeBoundary
      ? [
          `--${boundary}`,
          `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
          "",
          alternativeBody(alternativeBoundary, input),
        ].join("\r\n")
      : bodyPart(boundary, "text/plain", input.text);
    source = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      body,
      ...attachments.map((attachment) => attachmentPart(boundary, attachment)),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  return {
    raw: Buffer.from(source).toString("base64url"),
    threadId: reply?.threadId,
  };
}
