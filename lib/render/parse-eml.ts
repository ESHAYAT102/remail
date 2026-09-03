import PostalMime from "postal-mime";
import type { Address, Attachment, Message } from "@/lib/mail/types";

function asAddress(value?: { name?: string; address?: string } | null): Address {
  return {
    name: value?.name ?? "",
    email: value?.address ?? "",
  };
}

export async function parseEml(
  raw: string | ArrayBuffer | Uint8Array,
  threadId: string,
): Promise<Message> {
  const email = await PostalMime.parse(raw);
  const from = asAddress(email.from);
  const to = (email.to ?? []).map((item) => asAddress(item));
  const attachments: Attachment[] = (email.attachments ?? []).map((item, index) => ({
    id: item.contentId ?? `att_${index}`,
    filename: item.filename ?? "attachment",
    mimeType: item.mimeType ?? "application/octet-stream",
    size: item.content instanceof ArrayBuffer ? item.content.byteLength : 0,
    contentId: item.contentId,
    inline: item.disposition === "inline",
    content: item.content,
  }));

  return {
    id: email.messageId ?? threadId,
    threadId,
    from,
    to,
    date: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
    subject: email.subject ?? "(no subject)",
    snippet: (email.text ?? email.html ?? "").replace(/<[^>]+>/g, "").slice(0, 100),
    text: email.text ?? undefined,
    html: email.html ?? undefined,
    attachments,
  };
}
