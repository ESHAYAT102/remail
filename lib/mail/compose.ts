import type { ComposeAttachment, ComposeInput } from "./types";
import { MailError } from "./errors.ts";
import { sanitizeEmailHtml } from "../render/sanitize.ts";

const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_HEADER = 32 * 1024;
const MAX_SUBJECT = 998;
const MAX_TEXT = 20 * 1024 * 1024;

export function parseAddressList(value?: string) {
  if (!value) return [];
  return value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((email) => ({ name: "", email }));
}

export async function filesToAttachments(files: File[]): Promise<ComposeAttachment[]> {
  let total = 0;
  const attachments: ComposeAttachment[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE) {
      throw new MailError(`${file.name} is larger than 10 MB.`);
    }
    total += file.size;
    if (total > MAX_TOTAL) {
      throw new MailError("Attachments are larger than 25 MB together.");
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    attachments.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(buffer).toString("base64"),
    });
  }
  return attachments;
}

export function attachmentBytes(attachment: ComposeAttachment) {
  return Buffer.from(attachment.data, "base64");
}

export async function composeFromRequest(request: Request): Promise<{
  input: ComposeInput;
  attachmentUploadIds: string[];
}> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    const uploadIds = String(form.get("attachmentUploadIds") ?? "")
      .split(",")
      .filter(Boolean);
    return {
      input: validateComposeInput({
        from: String(form.get("from") ?? "") || undefined,
        to: String(form.get("to") ?? ""),
        cc: String(form.get("cc") ?? "") || undefined,
        bcc: String(form.get("bcc") ?? "") || undefined,
        subject: String(form.get("subject") ?? ""),
        text: String(form.get("text") ?? ""),
        html: String(form.get("html") ?? "") || undefined,
        inReplyTo: String(form.get("inReplyTo") ?? "") || undefined,
        threadId: String(form.get("threadId") ?? "") || undefined,
        draftId: String(form.get("draftId") ?? "") || undefined,
        attachments: files.length ? await filesToAttachments(files) : undefined,
      }),
      attachmentUploadIds: uploadIds,
    };
  }
  return {
    input: validateComposeInput(await request.json()),
    attachmentUploadIds: [],
  };
}

export function validateComposeInput(value: unknown): ComposeInput {
  if (!value || typeof value !== "object") {
    throw new MailError("Invalid message.");
  }
  const input = value as Record<string, unknown>;
  const from = stringField(input.from, "sender", 320);
  const to = stringField(input.to, "recipients", MAX_HEADER, true);
  const cc = stringField(input.cc, "Cc", MAX_HEADER);
  const bcc = stringField(input.bcc, "Bcc", MAX_HEADER);
  const subject = stringField(input.subject, "subject", MAX_SUBJECT) ?? "";
  const text = (stringField(input.text, "message", MAX_TEXT) ?? "").replace(
    /\r\n?/g,
    "\n",
  );
  const html = stringField(input.html, "HTML message", MAX_TEXT);
  const inReplyTo = stringField(input.inReplyTo, "reply", 512);
  const threadId = stringField(input.threadId, "thread", 512);
  const draftId = stringField(input.draftId, "draft", 512);
  const attachments = validateAttachments(input.attachments);
  const cleanHtml = styledComposerHtml(html);
  return {
    from: from?.trim() || undefined,
    to: to.trim(),
    cc: cc?.trim() || undefined,
    bcc: bcc?.trim() || undefined,
    subject,
    text,
    html: cleanHtml,
    inReplyTo,
    threadId,
    draftId,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

function styledComposerHtml(value?: string) {
  const authoredHtml = value?.trim() ?? "";
  if (!authoredHtml) return undefined;
  return sanitizeEmailHtml(authoredHtml)
    .html.replace(
      '<div class="redakt-composer">',
      '<div class="redakt-composer" style="white-space:pre-wrap">',
    )
    .replace(/<p>/g, '<p style="margin:0">') || undefined;
}

function stringField(
  value: unknown,
  label: string,
  max: number,
  required: true,
): string;
function stringField(
  value: unknown,
  label: string,
  max: number,
  required?: false,
): string | undefined;
function stringField(
  value: unknown,
  label: string,
  max: number,
  required = false,
) {
  if (value === undefined || value === null || value === "") {
    if (required) return "";
    return undefined;
  }
  if (typeof value !== "string") throw new MailError(`Invalid ${label}.`);
  if (Buffer.byteLength(value, "utf8") > max) {
    throw new MailError(`The ${label} is too long.`);
  }
  return value;
}

function validateAttachments(value: unknown): ComposeAttachment[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MailError("Invalid attachments.");
  let total = 0;
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new MailError("Invalid attachment.");
    }
    const attachment = item as Record<string, unknown>;
    const filename = stringField(attachment.filename, "file name", 255, true);
    const mimeType = stringField(attachment.mimeType, "file type", 255, true);
    const data = stringField(
      attachment.data,
      "attachment data",
      Math.ceil((MAX_FILE * 4) / 3) + 4,
      true,
    );
    const size = decodedBase64Size(data);
    if (size === null) throw new MailError(`${filename || "A file"} is invalid.`);
    if (size > MAX_FILE) {
      throw new MailError(`${filename || "A file"} is larger than 10 MB.`);
    }
    total += size;
    if (total > MAX_TOTAL) {
      throw new MailError("Attachments are larger than 25 MB together.");
    }
    return {
      filename,
      mimeType: mimeType || "application/octet-stream",
      size,
      data,
    };
  });
}

function decodedBase64Size(value: string) {
  const normalized = value.replace(/\s/g, "");
  if (normalized === "") return 0;
  if (
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      normalized,
    )
  ) {
    return null;
  }
  const padding = normalized.endsWith("==")
    ? 2
    : normalized.endsWith("=")
      ? 1
      : 0;
  return (normalized.length / 4) * 3 - padding;
}
