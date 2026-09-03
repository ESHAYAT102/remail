import { getMailHostname } from "@/lib/env";
import { verifyRecords } from "@/lib/dns/doh";
import { parseZoneFile, synthesizeZone } from "@/lib/dns/parse-zone";
import { summarizeRequiredDnsChecks } from "@/lib/dns/records";
import {
  getMailboxSecret,
  getUserDomain,
  listUserDomains,
  saveUserDomain,
  setMailboxSecret,
} from "@/lib/data/accounts";
import { folderCollectionTransfer } from "@/lib/mail/collections";
import type { DomainProvider, MailProvider } from "@/lib/mail/provider";
import { attachmentBytes, parseAddressList } from "@/lib/mail/compose";
import { MailError } from "@/lib/mail/errors";
import { PAGE_SIZE } from "@/lib/mail/list-query";
import type {
  Address,
  Attachment,
  ComposeInput,
  DomainSetup,
  MailAccount,
  MailCollection,
  Message,
  Thread,
  ThreadDetail,
} from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";
import { StalwartClient } from "./client";
import { stalwartFolderCounts } from "./folder-counts";
import {
  collectionIdFromView,
  isMailFolder,
  type MailViewId,
} from "@/lib/mail/routes";

type JmapPart = {
  blobId?: string;
  name?: string;
  type?: string;
  size?: number;
  cid?: string;
  disposition?: string;
};

type JmapEmail = {
  id: string;
  threadId?: string;
  from?: Address[];
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  subject?: string;
  receivedAt?: string;
  preview?: string;
  keywords?: Record<string, boolean>;
  textBody?: Array<{ partId?: string }>;
  htmlBody?: Array<{ partId?: string }>;
  bodyValues?: Record<string, { value?: string }>;
  attachments?: JmapPart[];
  mailboxIds?: Record<string, boolean>;
  messageId?: string[];
  inReplyTo?: string[];
  references?: string[];
};

const folderRoles: Record<string, string> = {
  inbox: "inbox",
  sent: "sent",
  drafts: "drafts",
  spam: "junk",
  trash: "trash",
  archived: "archive",
};

function asAddress(value?: Address[]): Address {
  return value?.[0] ?? { name: "", email: "" };
}

function bodyText(email: JmapEmail, kind: "text" | "html") {
  const parts = kind === "html" ? email.htmlBody : email.textBody;
  const partId = parts?.[0]?.partId;
  if (!partId) return undefined;
  return email.bodyValues?.[partId]?.value;
}

function toThread(email: JmapEmail, folder: string): Thread {
  return {
    id: email.threadId || email.id,
    folder,
    subject: email.subject ?? "(no subject)",
    from: asAddress(email.from),
    snippet: email.preview ?? "",
    date: email.receivedAt ?? new Date().toISOString(),
    unread: !email.keywords?.$seen,
    collectionIds: Object.entries(email.mailboxIds ?? {})
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    hasAttachment: (email.attachments ?? []).some((part) => part.disposition !== "inline"),
    messageCount: 1,
  };
}

function toAttachments(email: JmapEmail): Attachment[] {
  return (email.attachments ?? [])
    .filter((part) => part.blobId)
    .map((part) => ({
      id: part.blobId as string,
      filename: part.name || "attachment",
      mimeType: part.type || "application/octet-stream",
      size: part.size ?? 0,
      contentId: part.cid,
      inline: part.disposition === "inline",
    }));
}

function toMessage(email: JmapEmail): Message {
  return {
    id: email.id,
    threadId: email.threadId || email.id,
    from: asAddress(email.from),
    to: email.to ?? [],
    cc: email.cc,
    bcc: email.bcc,
    date: email.receivedAt ?? new Date().toISOString(),
    subject: email.subject ?? "",
    snippet: email.preview ?? "",
    text: bodyText(email, "text") ?? email.preview,
    html: bodyText(email, "html"),
    attachments: toAttachments(email),
  };
}

async function mailboxClient(user: SessionUser) {
  const secret = await getMailboxSecret(user);
  if (!secret) return null;
  return StalwartClient.forMailbox(user.email, secret);
}

export function createStalwartProvider(
  user: SessionUser,
  mailAccount: MailAccount,
): MailProvider & DomainProvider {
  const admin = StalwartClient.fromEnv();
  let mailboxClientPromise: ReturnType<typeof mailboxClient> | null = null;
  const getMailboxClient = () => {
    mailboxClientPromise ??= mailboxClient(user);
    return mailboxClientPromise;
  };

  const provider: MailProvider & DomainProvider = {
    account: mailAccount,

    async getMailbox() {
      return {
        email: mailAccount.email,
        name: mailAccount.displayName,
        connector: mailAccount.connector,
      };
    },

    async listThreads(folder, query = {}) {
      const client = await getMailboxClient();
      if (!client) {
        return { threads: [], total: 0, unread: 0, hasMore: false };
      }
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return { threads: [], total: 0, unread: 0, hasMore: false };
      const unreadOnly = folder === "smart" || Boolean(query.unread);
      const boxes = await client.listMailboxes(accountId);
      const collectionId = collectionIdFromView(folder);
      const isStarred = folder === "starred";
      const role = isMailFolder(folder)
        ? folderRoles[folder === "smart" ? "inbox" : folder]
        : null;
      const mailboxId = collectionId
        ? boxes.find((item) => item.id === collectionId && !item.role)?.id
        : boxes.find((item) => item.role === role)?.id;
      if (!mailboxId && !isStarred) {
        return { threads: [], total: 0, unread: 0, hasMore: false };
      }
      const limit = Math.min(50, Math.max(1, query.limit ?? PAGE_SIZE));
      const offset = Math.max(0, query.offset ?? 0);
      const jmapSort =
        query.sort === "from" ? "from" : query.sort === "subject" ? "subject" : "receivedAt";
      const { page, emails, unread: unreadQuery } = await client.listEmails(
        accountId,
        {
          mailboxId,
          unreadOnly,
          keyword: isStarred ? "$flagged" : undefined,
          text: query.q,
          hasAttachment: query.hasAttachment,
          sort: jmapSort,
          ascending: query.order === "asc",
          limit,
          position: offset,
        },
      );
      const threads = (emails.list ?? []).map((row) => toThread(row as JmapEmail, folder));
      const total = page.total ?? threads.length;
      return {
        threads,
        total,
        unread: unreadQuery.total ?? (unreadOnly ? total : 0),
        hasMore: offset + threads.length < total,
      };
    },

    async getThread(id: string) {
      const client = await getMailboxClient();
      if (!client) return null;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return null;
      const emails = await client.getThreadEmails(accountId, id);
      const list = (emails.list ?? []) as JmapEmail[];
      if (list.length === 0) return null;
      const first = list[0];
      const messages = await Promise.all(
        list.map(async (email) => {
          const message = toMessage(email);
          for (const file of message.attachments) {
            if (!file.contentId) continue;
            try {
              const blob = await client.download(accountId, file.id, file.filename);
              file.content = blob.bytes;
            } catch {
              // keep metadata
            }
          }
          return message;
        }),
      );
      const thread: ThreadDetail = {
        ...toThread(first, "inbox"),
        unread: list.some((email) => !email.keywords?.$seen),
        collectionIds: [
          ...new Set(
            list.flatMap((email) =>
              Object.entries(email.mailboxIds ?? {})
                .filter(([, selected]) => selected)
                .map(([mailboxId]) => mailboxId),
            ),
          ),
        ],
        messages,
      };
      return thread;
    },

    async getFolderCounts() {
      const client = await getMailboxClient();
      if (!client) return stalwartFolderCounts([], 0);
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return stalwartFolderCounts([], 0);
      const [boxes, starred] = await Promise.all([
        client.listMailboxes(accountId),
        client.queryEmails(accountId, { keyword: "$flagged", limit: 1 }),
      ]);
      return stalwartFolderCounts(boxes, starred.total ?? 0);
    },

    async listCollections(): Promise<MailCollection[]> {
      const client = await getMailboxClient();
      if (!client) return [];
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return [];
      const boxes = await client.listMailboxes(accountId);
      return boxes
        .filter((mailbox) => !mailbox.role && mailbox.name)
        .map((mailbox) => ({
          id: mailbox.id,
          name: mailbox.name as string,
          kind: "folder" as const,
          total: mailbox.totalThreads ?? mailbox.totalEmails,
          unread: mailbox.unreadThreads ?? mailbox.unreadEmails,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },

    async createCollection(name: string): Promise<MailCollection> {
      const client = await mailboxClient(user);
      if (!client) {
        throw new MailError("Mailbox isn’t ready. Finish domain setup first.");
      }
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) throw new Error("Unable to open this mailbox.");
      const boxes = await client.listMailboxes(accountId);
      if (
        boxes.some(
          (mailbox) =>
            !mailbox.role &&
            mailbox.name?.localeCompare(name, undefined, {
              sensitivity: "accent",
            }) === 0,
        )
      ) {
        throw new Error("A folder with this name already exists.");
      }
      const id = await client.createMailbox(accountId, name);
      return { id, name, kind: "folder" };
    },

    async renameCollection(id: string, name: string) {
      const client = await mailboxClient(user);
      if (!client) {
        throw new MailError("Mailbox isn’t ready. Finish domain setup first.");
      }
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) throw new Error("Unable to open this mailbox.");
      const boxes = await client.listMailboxes(accountId);
      const collection = boxes.find(
        (mailbox) => mailbox.id === id && !mailbox.role,
      );
      if (!collection) throw new Error("Folder not found.");
      if (
        boxes.some(
          (mailbox) =>
            mailbox.id !== id &&
            !mailbox.role &&
            mailbox.name?.localeCompare(name, undefined, {
              sensitivity: "accent",
            }) === 0,
        )
      ) {
        throw new Error("A folder with this name already exists.");
      }
      await client.renameMailbox(accountId, id, name);
      return {
        id,
        name,
        kind: "folder" as const,
        total: collection.totalThreads ?? collection.totalEmails,
        unread: collection.unreadThreads ?? collection.unreadEmails,
      };
    },

    async deleteCollection(id: string) {
      const client = await mailboxClient(user);
      if (!client) {
        throw new MailError("Mailbox isn’t ready. Finish domain setup first.");
      }
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) throw new Error("Unable to open this mailbox.");
      const boxes = await client.listMailboxes(accountId);
      const collection = boxes.find(
        (mailbox) => mailbox.id === id && !mailbox.role,
      );
      if (!collection) return false;
      const inbox = boxes.find((mailbox) => mailbox.role === "inbox");
      if (!inbox) throw new Error("Inbox is unavailable.");

      while (true) {
        const ids =
          (
            await client.queryEmails(accountId, {
              mailboxId: id,
              collapseThreads: false,
              limit: 100,
            })
          ).ids ?? [];
        if (ids.length === 0) break;
        const moved = await client.moveEmails(accountId, ids, id, inbox.id);
        if (!moved) {
          throw new Error("Unable to move folder conversations to Inbox.");
        }
      }

      return client.deleteMailbox(accountId, id);
    },

    async setThreadCollection(
      id: string,
      collectionId: string,
      selected: boolean,
      fromView: MailViewId,
    ) {
      const client = await mailboxClient(user);
      if (!client) return false;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return false;
      const boxes = await client.listMailboxes(accountId);
      const collection = boxes.find(
        (mailbox) => mailbox.id === collectionId && !mailbox.role,
      );
      if (!collection) return false;
      const transfer = folderCollectionTransfer(
        collection.id,
        selected,
        fromView,
      );
      const sourceCollectionId = collectionIdFromView(transfer.source);
      const sourceRole = isMailFolder(transfer.source)
        ? folderRoles[transfer.source === "smart" ? "inbox" : transfer.source]
        : null;
      const sourceMailboxId = sourceCollectionId
        ? boxes.find(
            (mailbox) => mailbox.id === sourceCollectionId && !mailbox.role,
          )?.id
        : boxes.find((mailbox) => mailbox.role === sourceRole)?.id;
      const destinationCollectionId = collectionIdFromView(
        transfer.destination,
      );
      const destinationRole = isMailFolder(transfer.destination)
        ? folderRoles[transfer.destination]
        : null;
      const destinationMailboxId = destinationCollectionId
        ? boxes.find(
            (mailbox) =>
              mailbox.id === destinationCollectionId && !mailbox.role,
          )?.id
        : boxes.find((mailbox) => mailbox.role === destinationRole)?.id;
      if (
        !sourceMailboxId ||
        !destinationMailboxId ||
        sourceMailboxId === destinationMailboxId
      ) {
        return false;
      }
      const threadIds = (await client.queryThreadEmails(accountId, id)).ids ?? [];
      const emails = await client.getEmails(accountId, threadIds);
      const sourceIds = (emails.list ?? [])
        .filter((email) =>
          Boolean((email as JmapEmail).mailboxIds?.[sourceMailboxId]),
        )
        .map((email) => String(email.id));
      return client.moveEmails(
        accountId,
        sourceIds,
        sourceMailboxId,
        destinationMailboxId,
      );
    },

    async getAttachment(id: string, filename = "attachment") {
      const client = await mailboxClient(user);
      if (!client) return null;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return null;
      try {
        const file = await client.download(accountId, id, filename);
        return {
          bytes: file.bytes,
          mimeType: file.type,
          filename,
        };
      } catch {
        return null;
      }
    },

    async setThreadUnread(id: string, unread: boolean) {
      const client = await mailboxClient(user);
      if (!client) return false;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return false;
      const ids = (await client.queryThreadEmails(accountId, id)).ids ?? [];
      return client.setEmailsSeen(accountId, ids, !unread);
    },

    async archiveThread(id: string, fromFolder: string) {
      const client = await mailboxClient(user);
      if (!client) return false;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return false;
      const boxes = await client.listMailboxes(accountId);
      const sourceCollectionId = collectionIdFromView(fromFolder);
      const sourceRole = isMailFolder(fromFolder)
        ? folderRoles[fromFolder === "smart" ? "inbox" : fromFolder]
        : null;
      if (sourceRole === "archive") return false;
      const sourceMailboxId = sourceCollectionId
        ? boxes.find(
            (item) => item.id === sourceCollectionId && !item.role,
          )?.id
        : boxes.find((item) => item.role === sourceRole)?.id;
      let archiveMailboxId = boxes.find((item) => item.role === "archive")?.id;
      if (!sourceMailboxId) return false;
      if (!archiveMailboxId) {
        archiveMailboxId = await client.createMailbox(accountId, "Archive", "archive");
      }
      if (!archiveMailboxId) return false;
      const threadIds = (await client.queryThreadEmails(accountId, id)).ids ?? [];
      const emails = await client.getEmails(accountId, threadIds);
      const sourceIds = (emails.list ?? [])
        .filter((email) => Boolean((email as JmapEmail).mailboxIds?.[sourceMailboxId]))
        .map((email) => String(email.id));
      return client.moveEmails(accountId, sourceIds, sourceMailboxId, archiveMailboxId);
    },

    async setThreadStarred() {
      return false;
    },

    async moveThread(
      id: string,
      destination: "inbox" | "spam" | "trash",
      fromFolder: MailViewId,
    ) {
      const client = await mailboxClient(user);
      if (!client) return false;
      await client.connect();
      const accountId = client.mailAccountId();
      if (!accountId) return false;
      const boxes = await client.listMailboxes(accountId);
      const sourceCollectionId = collectionIdFromView(fromFolder);
      const sourceRole = isMailFolder(fromFolder)
        ? folderRoles[fromFolder === "smart" ? "inbox" : fromFolder]
        : null;
      const sourceMailboxId = sourceCollectionId
        ? boxes.find(
            (mailbox) => mailbox.id === sourceCollectionId && !mailbox.role,
          )?.id
        : boxes.find((mailbox) => mailbox.role === sourceRole)?.id;
      const destinationRole = destination === "spam" ? "junk" : destination;
      const destinationMailboxId = boxes.find(
        (mailbox) => mailbox.role === destinationRole,
      )?.id;
      if (
        !sourceMailboxId ||
        !destinationMailboxId ||
        sourceMailboxId === destinationMailboxId
      ) {
        return false;
      }
      const threadIds = (await client.queryThreadEmails(accountId, id)).ids ?? [];
      const emails = await client.getEmails(accountId, threadIds);
      const sourceIds = (emails.list ?? [])
        .filter((email) =>
          Boolean((email as JmapEmail).mailboxIds?.[sourceMailboxId]),
        )
        .map((email) => String(email.id));
      return client.moveEmails(
        accountId,
        sourceIds,
        sourceMailboxId,
        destinationMailboxId,
      );
    },

    async send(input: ComposeInput) {
      const client = await mailboxClient(user);
      if (!client) throw new MailError("Mailbox isn’t ready. Finish domain setup first.");
      await client.connect();
      const accountId = client.mailAccountId();
      const boxes = await client.listMailboxes(accountId);
      const drafts = boxes.find((item) => item.role === "drafts")?.id;
      const sent = boxes.find((item) => item.role === "sent")?.id;
      if (!drafts) throw new Error("Drafts mailbox is missing.");
      let identities = (await client.listIdentities(accountId)).list ?? [];
      if (identities.length === 0) {
        await client.createIdentity(accountId, { name: user.name, email: user.email });
        identities = (await client.listIdentities(accountId)).list ?? [];
      }
      const identity = identities.find((item) => item.email === user.email) ?? identities[0];
      if (!identity) throw new Error("Unable to create a sending identity.");
      const uploaded = [];
      for (const file of input.attachments ?? []) {
        const blob = await client.upload(
          accountId,
          attachmentBytes(file),
          file.mimeType,
        );
        uploaded.push({
          blobId: blob.blobId,
          type: file.mimeType,
          name: file.filename,
          size: file.size,
        });
      }
      let inReplyTo: string[] | undefined;
      let references: string[] | undefined;
      if (input.inReplyTo) {
        const source = await client.getEmails(accountId, [input.inReplyTo]);
        const original = (source.list?.[0] ?? {}) as JmapEmail;
        const messageId = original.messageId?.[0];
        if (messageId) {
          inReplyTo = [messageId];
          references = [...(original.references ?? []), messageId];
        }
      }
      const draft = await client.createDraft(accountId, drafts, {
        from: { name: user.name, email: user.email },
        to: parseAddressList(input.to),
        cc: parseAddressList(input.cc),
        bcc: parseAddressList(input.bcc),
        subject: input.subject,
        text: input.text,
        html: input.html,
        inReplyTo,
        references,
        attachments: uploaded,
      });
      const emailId = draft.created?.draft1?.id;
      if (!emailId) throw new Error("Unable to create the draft.");
      await client.submitEmail(accountId, identity.id, emailId, { drafts, sent });
      let threadId = input.threadId || emailId;
      let sentAt = new Date().toISOString();
      try {
        const created = await client.getEmails(accountId, [emailId]);
        const email = created.list?.[0] as JmapEmail | undefined;
        threadId = email?.threadId || threadId;
        sentAt = email?.receivedAt || sentAt;
      } catch (error) {
        // Delivery already succeeded. Keep the optimistic identifiers rather
        // than reporting a failure that could encourage a duplicate retry.
        console.error("mail/send post-submit lookup", error);
      }
      return { id: emailId, threadId, sentAt };
    },

    async saveDraft() {
      throw new MailError("Drafts are not available for this account yet.");
    },

    async deleteDraft() {
      return false;
    },

    async listDomains() {
      return listUserDomains(user);
    },

    async addDomain(name: string, mailboxLocalPart: string, password?: string) {
      const created = await admin.createDomain(name);
      let entry = created.created?.new1;
      if (!entry?.id) {
        const existing = await admin.queryDomain(name);
        const id = existing.ids?.[0];
        if (id) {
          const fetched = await admin.getDomain(id);
          entry = fetched.list?.[0];
        }
      }
      const zone = entry?.dnsZoneFile ?? synthesizeZone(name, getMailHostname());
      const records = parseZoneFile(zone);
      const secret = password ?? (await getMailboxSecret(user)) ?? crypto.randomUUID();
      let stalwartAccountId: string | undefined;
      if (entry?.id) {
        const account = await admin.createAccount(mailboxLocalPart, entry.id, secret);
        stalwartAccountId = account.created?.new1?.id;
      }
      const setup: DomainSetup = {
        id: entry?.id ?? `dom_${name.replace(/\W/g, "_")}`,
        name,
        status: "pending",
        records,
        checks: records.map((record) => ({ ...record, ok: false })),
        mailbox: `${mailboxLocalPart}@${name}`,
      };
      await setMailboxSecret(
        user,
        setup.mailbox ?? user.email,
        secret,
        stalwartAccountId,
      );
      return saveUserDomain(user, setup);
    },

    async verifyDomain(id: string) {
      const current = await getUserDomain(user, id);
      if (!current) throw new Error("Domain not found");
      let records = current.records;
      try {
        const fetched = await admin.getDomain(id);
        const zone = fetched.list?.[0]?.dnsZoneFile;
        if (zone) records = parseZoneFile(zone);
      } catch {
        // keep cached records
      }
      const checks = await verifyRecords(records, current.name);
      const required = summarizeRequiredDnsChecks(checks, current.name);
      const status: DomainSetup["status"] =
        required.ready ? "ok" : required.okCount > 0 ? "partial" : "pending";
      return saveUserDomain(user, {
        ...current,
        records,
        checks,
        status,
        lastCheckedAt: new Date().toISOString(),
      });
    },
  };
  return provider;
}
