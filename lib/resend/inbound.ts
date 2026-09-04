import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { domains, hostedAttachments, hostedMessages } from "@/lib/db/schema";
import { getResend, unwrapResend } from "./client";
import {
  fallbackReplyThread,
  normalizeMessageId,
  referencedMessageIds,
} from "./threading";

type ReceivedData = {
  email_id: string;
  message_id: string;
  to: string[];
  received_for?: string[];
};

function emailDomain(value: string) {
  const email = value.match(/<?([^<>\s]+@[^<>\s]+)>?$/)?.[1] ?? value;
  return email.split("@").at(-1)?.toLowerCase().replace(/\.$/, "");
}

function parseAddress(value: string) {
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  return match ? { name: match[1]?.trim() ?? "", email: match[2] } : { name: "", email: value };
}

export async function ingestReceivedEmail(data: ReceivedData) {
  const database = getDb();
  const recipientDomains = [...new Set([...data.to, ...(data.received_for ?? [])].map(emailDomain).filter(Boolean))] as string[];
  if (!recipientDomains.length) throw new Error("Inbound email has no routable recipient.");
  const owners = await database.select().from(domains).where(inArray(domains.name, recipientDomains));
  if (owners.length !== 1) throw new Error("Inbound domain does not have exactly one owner.");
  const owner = owners[0];
  const [duplicate] = await database.select({ id: hostedMessages.id }).from(hostedMessages).where(eq(hostedMessages.providerEmailId, data.email_id));
  if (duplicate) return duplicate.id;

  const resend = await getResend(owner.userId);
  const remote = unwrapResend(await resend.emails.receiving.get(data.email_id));
  const parentIds = referencedMessageIds(remote.headers);
  const candidates = await database
    .select()
    .from(hostedMessages)
    .where(eq(hostedMessages.userId, owner.userId))
    .orderBy(desc(hostedMessages.receivedAt));
  const parent = candidates.find(
    (candidate) =>
      candidate.messageId &&
      parentIds.includes(normalizeMessageId(candidate.messageId)),
  );
  const from = parseAddress(remote.headers?.from ?? remote.from);
  const id = crypto.randomUUID();
  const threadId =
    parent?.threadId ??
    fallbackReplyThread(remote.subject, from.email, candidates) ??
    id;
  const attachmentList = remote.attachments.length
    ? unwrapResend(await resend.emails.receiving.attachments.list({ emailId: data.email_id }))
    : { data: [] };
  const files = await Promise.all(attachmentList.data.map(async (file) => {
    const response = await fetch(file.download_url);
    if (!response.ok) throw new Error(`Unable to download inbound attachment (${response.status}).`);
    return {
      id: crypto.randomUUID(), messageId: id, filename: file.filename ?? "attachment",
      mimeType: file.content_type, size: file.size, contentId: file.content_id,
      inline: file.content_disposition === "inline",
      content: Buffer.from(await response.arrayBuffer()).toString("base64"),
    };
  }));
  await database.transaction(async (tx) => {
    if (threadId !== id) {
      await tx
        .update(hostedMessages)
        .set({ folder: "inbox" })
        .where(
          and(
            eq(hostedMessages.userId, owner.userId),
            eq(hostedMessages.threadId, threadId),
          ),
        );
    }
    await tx.insert(hostedMessages).values({
      id, userId: owner.userId, domainId: owner.id, providerEmailId: data.email_id,
      messageId: remote.message_id, threadId, direction: "inbound", folder: "inbox", unread: true,
      from, to: remote.to.map(parseAddress),
      cc: (remote.cc ?? []).map(parseAddress), bcc: (remote.bcc ?? []).map(parseAddress),
      replyTo: (remote.reply_to ?? []).map(parseAddress), subject: remote.subject,
      text: remote.text, html: remote.html, headers: remote.headers ?? {}, receivedAt: new Date(remote.created_at),
    }).onConflictDoNothing({ target: hostedMessages.providerEmailId });
    if (files.length) await tx.insert(hostedAttachments).values(files);
  });
  return id;
}
