import type {
  Address,
  Attachment,
  Message,
  Thread,
  ThreadDetail,
} from "@/lib/mail/types";
import type {
  GmailHeader,
  GmailMessage,
  GmailMessagePart,
  GmailThread,
} from "./client";

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function gmailHeaderValue(
  headers: GmailHeader[] | undefined,
  name: string,
) {
  return headers?.find(
    (item) => item.name?.toLocaleLowerCase() === name.toLocaleLowerCase(),
  )?.value;
}

export function parseGmailAddress(value?: string): Address {
  if (!value) return { name: "", email: "" };
  const match = value.match(/^\s*(?:"?([^"<]+?)"?\s*)?<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1]?.trim() ?? "", email: match[2].trim() };
  }
  const email = value.trim();
  return { name: "", email };
}

export function parseGmailAddresses(value?: string): Address[] {
  if (!value) return [];
  const matches = value.match(/(?:"[^"]*"|[^,])+(?:,|$)/g) ?? [];
  return matches
    .map((item) => parseGmailAddress(item.replace(/,$/, "").trim()))
    .filter((item) => item.email);
}

function timestamp(message: GmailMessage) {
  const value = Number(message.internalDate);
  return Number.isFinite(value) && value > 0
    ? new Date(value).toISOString()
    : new Date().toISOString();
}

function walkParts(
  part: GmailMessagePart | undefined,
  visit: (part: GmailMessagePart) => void,
) {
  if (!part) return;
  visit(part);
  for (const child of part.parts ?? []) walkParts(child, visit);
}

function partDisposition(part: GmailMessagePart) {
  return gmailHeaderValue(part.headers, "Content-Disposition") ?? "";
}

function partContentId(part: GmailMessagePart) {
  return gmailHeaderValue(part.headers, "Content-ID")?.replace(/^<|>$/g, "");
}

function isMessageBodyPart(part: GmailMessagePart) {
  const isTextBody =
    part.mimeType === "text/plain" || part.mimeType === "text/html";
  if (!isTextBody || part.filename || partContentId(part)) return false;
  return !partDisposition(part).toLocaleLowerCase().includes("attachment");
}

export function gmailMessageBodyAttachmentParts(message: GmailMessage) {
  const parts: GmailMessagePart[] = [];
  walkParts(message.payload, (part) => {
    if (
      isMessageBodyPart(part) &&
      !part.body?.data &&
      part.body?.attachmentId
    ) {
      parts.push(part);
    }
  });
  return parts;
}

function bodyValue(message: GmailMessage, mimeType: "text/plain" | "text/html") {
  let value: string | undefined;
  walkParts(message.payload, (part) => {
    if (
      value !== undefined ||
      part.mimeType !== mimeType ||
      !isMessageBodyPart(part) ||
      !part.body?.data
    ) {
      return;
    }
    value = decodeBase64Url(part.body.data).toString("utf8");
  });
  return value;
}

export function encodeGmailAttachmentId(
  messageId: string,
  attachmentId: string,
  mimeType?: string,
  filename?: string,
) {
  return Buffer.from(
    JSON.stringify([messageId, attachmentId, mimeType, filename]),
  ).toString("base64url");
}

export function decodeGmailAttachmentId(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      parsed.length >= 2 &&
      parsed.length <= 4 &&
      typeof parsed[0] === "string" &&
      parsed[0].length > 0 &&
      typeof parsed[1] === "string" &&
      parsed[1].length > 0
    ) {
      return {
        messageId: parsed[0] as string,
        attachmentId: parsed[1] as string,
        mimeType:
          typeof parsed[2] === "string" &&
          /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*$/.test(
            parsed[2],
          )
            ? parsed[2]
            : "application/octet-stream",
        filename: typeof parsed[3] === "string" ? parsed[3] : "attachment",
      };
    }
  } catch {
    // Invalid public attachment identifier.
  }
  return null;
}

export function gmailAttachments(message: GmailMessage): Attachment[] {
  const attachments: Attachment[] = [];
  walkParts(message.payload, (part) => {
    const attachmentId = part.body?.attachmentId;
    const contentId = partContentId(part);
    const disposition = partDisposition(part).toLocaleLowerCase();
    const isAttachment =
      !isMessageBodyPart(part) &&
      Boolean(part.filename || attachmentId || contentId);
    if (!isAttachment) return;
    attachments.push({
      id: attachmentId
        ? encodeGmailAttachmentId(
            message.id,
            attachmentId,
            part.mimeType,
            part.filename,
          )
        : `${message.id}:${part.partId ?? attachments.length}`,
      filename: part.filename || contentId || "attachment",
      mimeType: part.mimeType || "application/octet-stream",
      size: part.body?.size ?? 0,
      contentId,
      inline: disposition.includes("inline") || Boolean(contentId),
      content: part.body?.data ? decodeBase64Url(part.body.data) : undefined,
    });
  });
  return attachments;
}

export function gmailMessageToMessage(message: GmailMessage): Message {
  const headers = message.payload?.headers;
  return {
    id: message.id,
    threadId: message.threadId,
    from: parseGmailAddress(gmailHeaderValue(headers, "From")),
    to: parseGmailAddresses(gmailHeaderValue(headers, "To")),
    cc: parseGmailAddresses(gmailHeaderValue(headers, "Cc")),
    bcc: parseGmailAddresses(gmailHeaderValue(headers, "Bcc")),
    date: timestamp(message),
    subject: gmailHeaderValue(headers, "Subject") ?? "",
    snippet: message.snippet ?? "",
    text: bodyValue(message, "text/plain") ?? message.snippet,
    html: bodyValue(message, "text/html"),
    attachments: gmailAttachments(message),
  };
}

export function gmailThreadToSummary(
  thread: GmailThread,
  folder: string,
  draftId?: string,
): Thread {
  const messages = thread.messages ?? [];
  const latest = messages.at(-1) ?? ({ id: thread.id, threadId: thread.id } as GmailMessage);
  const normalized = gmailMessageToMessage(latest);
  return {
    id: draftId ? `draft:${draftId}` : thread.id,
    draftId,
    folder,
    subject: normalized.subject || "(no subject)",
    from: normalized.from,
    snippet: normalized.snippet,
    date: normalized.date,
    unread: messages.some((message) => message.labelIds?.includes("UNREAD")),
    favorite: messages.some((message) => message.labelIds?.includes("STARRED")),
    collectionIds: [
      ...new Set(messages.flatMap((message) => message.labelIds ?? [])),
    ],
    hasAttachment: messages.some((message) => gmailAttachments(message).some((file) => !file.inline)),
    messageCount: messages.length || 1,
  };
}

export function gmailThreadToDetail(
  thread: GmailThread,
  folder = "inbox",
  draftId?: string,
): ThreadDetail | null {
  const messages = [...(thread.messages ?? [])].sort(
    (a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0),
  );
  if (messages.length === 0) return null;
  return {
    ...gmailThreadToSummary({ ...thread, messages }, folder, draftId),
    messages: messages.map(gmailMessageToMessage),
  };
}
