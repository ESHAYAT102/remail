import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  hostedAttachments,
  hostedCollections,
  hostedMessages,
} from "@/lib/db/schema";
import {
  getDomainByName,
  getUserDomain,
  listUserDomains,
  saveUserDomain,
} from "@/lib/data/accounts";
import { parseAddressList } from "@/lib/mail/compose";
import { MailError } from "@/lib/mail/errors";
import type { DomainProvider, MailProvider } from "@/lib/mail/provider";
import type {
  DnsCheck,
  DnsRecord,
  DomainSetup,
  MailAccount,
  MailFolderId,
  Message,
  Thread,
} from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";
import { getResend, unwrapResend } from "./client";

type StoredAddress = { name: string; email: string };
type StoredMessage = typeof hostedMessages.$inferSelect;

function addresses(value: unknown): StoredAddress[] {
  return Array.isArray(value) ? (value as StoredAddress[]) : [];
}

function mapRecord(record: {
  type: string;
  name: string;
  value: string;
  priority?: number;
}): DnsRecord | null {
  if (!["MX", "TXT", "CNAME", "A", "AAAA"].includes(record.type)) return null;
  return {
    type: record.type as DnsRecord["type"],
    host: record.name,
    value: record.value.replace(/^"|"$/g, ""),
    priority: record.priority,
  };
}

function domainSetup(
  domain: {
    id: string;
    name: string;
    status: string;
    records: Array<{
      type: string;
      name: string;
      value: string;
      priority?: number;
      status: string;
    }>;
  },
  mailbox?: string,
): DomainSetup {
  const pairs = domain.records.flatMap((item) => {
    const record = mapRecord(item);
    return record ? [{ record, providerStatus: item.status }] : [];
  });
  const checks: DnsCheck[] = pairs.map(({ record, providerStatus }) => ({
    ...record,
    ok: providerStatus === "verified",
  }));
  const okCount = checks.filter((check) => check.ok).length;
  return {
    id: domain.id,
    name: domain.name,
    status:
      domain.status === "verified"
        ? "ok"
        : okCount > 0 || domain.status.startsWith("partially_")
          ? "partial"
          : "pending",
    records: pairs.map(({ record }) => record),
    checks,
    mailbox,
    lastCheckedAt: new Date().toISOString(),
  };
}

function folderFor(row: StoredMessage): MailFolderId {
  return row.folder as MailFolderId;
}

function toMessage(
  row: StoredMessage,
  attachments: Array<typeof hostedAttachments.$inferSelect>,
): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    from: row.from as StoredAddress,
    to: addresses(row.to),
    cc: addresses(row.cc),
    bcc: addresses(row.bcc),
    date: row.receivedAt.toISOString(),
    subject: row.subject,
    snippet: (row.text ?? "").replace(/\s+/g, " ").slice(0, 180),
    text: row.text ?? undefined,
    html: row.html ?? undefined,
    attachments: attachments.map((file) => ({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      contentId: file.contentId ?? undefined,
      inline: file.inline,
    })),
  };
}

function toThread(rows: StoredMessage[]): Thread {
  const latest = rows.at(-1)!;
  return {
    id: latest.threadId,
    folder: folderFor(latest),
    subject: latest.subject || "(no subject)",
    from: latest.from as StoredAddress,
    snippet: (latest.text ?? "").replace(/\s+/g, " ").slice(0, 180),
    date: latest.receivedAt.toISOString(),
    unread: rows.some((row) => row.unread),
    hasAttachment: false,
    messageCount: rows.length,
  };
}

export function createResendProvider(
  user: SessionUser,
  mailAccount: MailAccount,
): MailProvider & DomainProvider {
  const database = getDb();
  return {
    account: mailAccount,
    async getMailbox() {
      return { email: mailAccount.email, name: mailAccount.displayName, connector: "hosted" };
    },
    async listThreads(folder, query = {}) {
      const rows = await database
        .select()
        .from(hostedMessages)
        .where(eq(hostedMessages.userId, user.id))
        .orderBy(asc(hostedMessages.receivedAt));
      const wanted = folder === "smart" ? "inbox" : folder;
      const grouped = new Map<string, StoredMessage[]>();
      for (const row of rows) {
        if (row.folder !== wanted) continue;
        if ((folder === "smart" || query.unread) && !row.unread) continue;
        if (query.q && !`${row.subject} ${row.text ?? ""}`.toLowerCase().includes(query.q.toLowerCase())) continue;
        const group = grouped.get(row.threadId) ?? [];
        group.push(row);
        grouped.set(row.threadId, group);
      }
      let threads = [...grouped.values()].map(toThread);
      const direction = query.order === "asc" ? 1 : -1;
      threads.sort((left, right) => {
        const key = query.sort === "from" ? "from" : query.sort === "subject" ? "subject" : "date";
        const a = key === "from" ? left.from.email : left[key];
        const b = key === "from" ? right.from.email : right[key];
        return a.localeCompare(b) * direction;
      });
      const total = threads.length;
      const offset = Math.max(0, query.offset ?? 0);
      const limit = Math.min(50, Math.max(1, query.limit ?? 30));
      threads = threads.slice(offset, offset + limit);
      return {
        threads,
        total,
        unread: [...grouped.values()].filter((group) => group.some((row) => row.unread)).length,
        hasMore: offset + threads.length < total,
      };
    },
    async getThread(id) {
      const rows = await database
        .select()
        .from(hostedMessages)
        .where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.threadId, id)))
        .orderBy(asc(hostedMessages.receivedAt));
      if (!rows.length) return null;
      const files = await database
        .select()
        .from(hostedAttachments)
        .where(inArray(hostedAttachments.messageId, rows.map((row) => row.id)));
      return {
        ...toThread(rows),
        hasAttachment: files.length > 0,
        messages: rows.map((row) =>
          toMessage(row, files.filter((file) => file.messageId === row.id)),
        ),
      };
    },
    async getFolderCounts() {
      const rows = await database.select().from(hostedMessages).where(eq(hostedMessages.userId, user.id));
      const empty = { inbox: 0, smart: 0, starred: 0, sent: 0, drafts: 0, spam: 0, trash: 0, archived: 0 };
      const unreadThreads = new Map<keyof typeof empty, Set<string>>();
      for (const row of rows) {
        if (!row.unread || !(row.folder in empty)) continue;
        const folder = row.folder as keyof typeof empty;
        const threads = unreadThreads.get(folder) ?? new Set<string>();
        threads.add(row.threadId);
        unreadThreads.set(folder, threads);
      }
      for (const [folder, threads] of unreadThreads) empty[folder] = threads.size;
      empty.smart = empty.inbox;
      return empty;
    },
    async listCollections() {
      const [folders, rows] = await Promise.all([
        database
          .select()
          .from(hostedCollections)
          .where(eq(hostedCollections.userId, user.id))
          .orderBy(asc(hostedCollections.name)),
        database
          .select()
          .from(hostedMessages)
          .where(eq(hostedMessages.userId, user.id)),
      ]);
      return folders.map((folder) => {
        const messages = rows.filter((row) => row.folder === `collection:${folder.id}`);
        return {
          id: folder.id,
          name: folder.name,
          kind: "folder" as const,
          total: new Set(messages.map((row) => row.threadId)).size,
          unread: new Set(messages.filter((row) => row.unread).map((row) => row.threadId)).size,
        };
      });
    },
    async createCollection(name) {
      const existing = await database
        .select()
        .from(hostedCollections)
        .where(eq(hostedCollections.userId, user.id));
      if (existing.some((folder) => folder.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
        throw new MailError("A folder with this name already exists.");
      }
      const [folder] = await database
        .insert(hostedCollections)
        .values({ id: crypto.randomUUID(), userId: user.id, name })
        .returning();
      return { id: folder.id, name: folder.name, kind: "folder" as const, total: 0, unread: 0 };
    },
    async renameCollection(id, name) {
      const existing = await database
        .select()
        .from(hostedCollections)
        .where(eq(hostedCollections.userId, user.id));
      const folder = existing.find((item) => item.id === id);
      if (!folder) throw new MailError("Folder not found.");
      if (existing.some((item) => item.id !== id && item.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
        throw new MailError("A folder with this name already exists.");
      }
      await database
        .update(hostedCollections)
        .set({ name })
        .where(and(eq(hostedCollections.userId, user.id), eq(hostedCollections.id, id)));
      return { id, name, kind: "folder" as const };
    },
    async deleteCollection(id) {
      const [folder] = await database
        .select()
        .from(hostedCollections)
        .where(and(eq(hostedCollections.userId, user.id), eq(hostedCollections.id, id)));
      if (!folder) return false;
      await database.transaction(async (tx) => {
        await tx
          .update(hostedMessages)
          .set({ folder: "inbox" })
          .where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.folder, `collection:${id}`)));
        await tx
          .delete(hostedCollections)
          .where(and(eq(hostedCollections.userId, user.id), eq(hostedCollections.id, id)));
      });
      return true;
    },
    async setThreadCollection(id, collectionId, selected) {
      const [folder] = await database
        .select({ id: hostedCollections.id })
        .from(hostedCollections)
        .where(and(eq(hostedCollections.userId, user.id), eq(hostedCollections.id, collectionId)));
      if (!folder) return false;
      const changed = await database
        .update(hostedMessages)
        .set({ folder: selected ? `collection:${collectionId}` : "inbox" })
        .where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.threadId, id)))
        .returning({ id: hostedMessages.id });
      return changed.length > 0;
    },
    async getAttachment(id) {
      const [file] = await database
        .select({ file: hostedAttachments, owner: hostedMessages.userId })
        .from(hostedAttachments)
        .innerJoin(hostedMessages, eq(hostedAttachments.messageId, hostedMessages.id))
        .where(eq(hostedAttachments.id, id));
      if (!file || file.owner !== user.id) return null;
      return { bytes: Buffer.from(file.file.content, "base64"), mimeType: file.file.mimeType, filename: file.file.filename };
    },
    async setThreadUnread(id, unread) {
      const changed = await database.update(hostedMessages).set({ unread }).where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.threadId, id))).returning({ id: hostedMessages.id });
      return changed.length > 0;
    },
    async setThreadStarred() { return false; },
    async archiveThread(id) {
      const changed = await database.update(hostedMessages).set({ folder: "archived" }).where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.threadId, id))).returning({ id: hostedMessages.id });
      return changed.length > 0;
    },
    async moveThread(id, destination) {
      const changed = await database.update(hostedMessages).set({ folder: destination }).where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.threadId, id))).returning({ id: hostedMessages.id });
      return changed.length > 0;
    },
    async send(input) {
      const domains = await listUserDomains(user);
      const sender = (input.from ?? mailAccount.email).trim().toLowerCase();
      const owned = domains.find((item) => sender.endsWith(`@${item.name}`));
      if (!owned) throw new MailError("Finish domain setup before sending mail.");
      const localPart = sender.slice(0, -(owned.name.length + 1));
      if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
        throw new MailError("Enter a valid sender address.");
      }
      const source = input.inReplyTo
        ? (await database.select().from(hostedMessages).where(and(eq(hostedMessages.userId, user.id), eq(hostedMessages.id, input.inReplyTo))))[0]
        : undefined;
      const headers = source?.messageId
        ? { "In-Reply-To": source.messageId, References: [String(source.headers && (source.headers as Record<string, string>).references || ""), source.messageId].filter(Boolean).join(" ") }
        : undefined;
      const resend = await getResend(user.id);
      const result = unwrapResend(await resend.emails.send({
        from: `${user.name} <${sender}>`,
        to: parseAddressList(input.to).map((item) => item.email),
        cc: parseAddressList(input.cc).map((item) => item.email),
        bcc: parseAddressList(input.bcc).map((item) => item.email),
        subject: input.subject,
        text: input.text,
        html: input.html,
        headers,
        attachments: input.attachments?.map((file) => ({ filename: file.filename, content: Buffer.from(file.data, "base64") })),
      }, { idempotencyKey: crypto.randomUUID() }));
      const id = crypto.randomUUID();
      const threadId = input.threadId ?? id;
      const sentAt = new Date();
      await database.insert(hostedMessages).values({
        id, userId: user.id, domainId: owned.id, providerEmailId: result.id,
        threadId, direction: "outbound", folder: "sent", unread: false,
        from: { name: user.name, email: sender }, to: parseAddressList(input.to),
        cc: parseAddressList(input.cc), bcc: parseAddressList(input.bcc), subject: input.subject,
        text: input.text, html: input.html, headers: headers ?? {}, receivedAt: sentAt,
      });
      if (input.attachments?.length) {
        await database.insert(hostedAttachments).values(
          input.attachments.map((file) => ({
            id: crypto.randomUUID(),
            messageId: id,
            filename: file.filename,
            mimeType: file.mimeType,
            size: file.size,
            contentId: null,
            inline: false,
            content: file.data,
          })),
        );
      }
      return { id, threadId, sentAt: sentAt.toISOString() };
    },
    async saveDraft() { throw new MailError("Drafts are not available for this account yet."); },
    async deleteDraft() { return false; },
    async listDomains() { return listUserDomains(user); },
    async addDomain(name, mailboxLocalPart) {
      const normalized = name.trim().toLowerCase().replace(/\.$/, "");
      if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) {
        throw new MailError("Enter a valid domain name.");
      }
      const mailbox = `${mailboxLocalPart}@${normalized}`;
      const existing = await getDomainByName(normalized);
      if (existing && existing.userId !== user.id) {
        throw new MailError("This domain is already connected to another Remail account.");
      }

      const resend = await getResend(user.id);
      let remote;
      if (existing) {
        remote = unwrapResend(await resend.domains.get(existing.id));
      } else {
        const listed = unwrapResend(await resend.domains.list({ limit: 100 }));
        const listedDomain = listed.data.find((domain) => domain.name === normalized);
        remote = listedDomain
          ? unwrapResend(await resend.domains.get(listedDomain.id))
          : unwrapResend(await resend.domains.create({
              name: normalized,
              capabilities: { sending: "enabled", receiving: "enabled" },
            }));
      }
      const setup = domainSetup(remote, mailbox);
      return saveUserDomain(user, setup);
    },
    async verifyDomain(id) {
      const current = await getUserDomain(user, id);
      if (!current) throw new MailError("Domain not found.");
      const resend = await getResend(user.id);
      await resend.domains.verify(id);
      const remote = unwrapResend(await resend.domains.get(id));
      return saveUserDomain(user, domainSetup(remote, current.mailbox));
    },
  };
}
