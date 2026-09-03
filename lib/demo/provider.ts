import { getMailHostname } from "@/lib/env";
import { verifyRecords } from "@/lib/dns/doh";
import { parseZoneFile, synthesizeZone } from "@/lib/dns/parse-zone";
import { summarizeRequiredDnsChecks } from "@/lib/dns/records";
import {
  getUserDomain,
  listUserDomains,
  listUserSent,
  saveUserDomain,
  saveUserSent,
  setMailboxSecret,
} from "@/lib/data/accounts";
import {
  deleteDemoCollection,
  listDemoCollections,
  listDemoThreadFolders,
  saveDemoCollection,
  saveDemoThreadFolder,
} from "@/lib/demo/store";
import type { SessionUser } from "@/lib/session";
import { collectFolderCounts } from "@/lib/mail/folder-counts";
import { MailError } from "@/lib/mail/errors";
import { folderCollectionTransfer } from "@/lib/mail/collections";
import type { DomainProvider, MailProvider } from "@/lib/mail/provider";
import type {
  Address,
  ComposeInput,
  DomainSetup,
  MailAccount,
  MailCollection,
  MailViewId,
  ThreadDetail,
} from "@/lib/mail/types";
import { pageThreads, toListItem } from "@/lib/mail/list-query";
import { collectionIdFromView, collectionViewId } from "@/lib/mail/routes";
import { OWNER_EMAIL, demoThreads } from "./catalog";
import { threadsFromFixtures } from "./from-fixtures";

type DemoMailState = {
  incoming: ThreadDetail[];
  hydrated: boolean;
};

const globalForDemoMail = globalThis as typeof globalThis & {
  __redaktDemoMail?: DemoMailState;
};

const demoMailState: DemoMailState = (globalForDemoMail.__redaktDemoMail ??= {
  incoming: demoThreads.map((thread) => ({
    ...thread,
    messages: [...thread.messages],
  })),
  hydrated: false,
});
const incoming = demoMailState.incoming;

async function hydrate() {
  if (demoMailState.hydrated) return;
  try {
    const fromDisk = await threadsFromFixtures();
    const seen = new Set(incoming.map((thread) => thread.subject));
    for (const thread of fromDisk) {
      if (seen.has(thread.subject)) continue;
      incoming.push(thread);
    }
  } catch {
    // catalog fallback
  }
  demoMailState.hydrated = true;
}

/**
 * The catalog is written against a fixed placeholder address. Rewriting it to
 * the signed-in mailbox is what lets the thread view say "to me".
 */
function asOwner<T extends ThreadDetail>(thread: T, user: SessionUser): T {
  const folder = listDemoThreadFolders(user.id)[thread.id] ?? thread.folder;
  const collectionId = collectionIdFromView(folder);
  const swap = (address: Address): Address =>
    address.email === OWNER_EMAIL ? { name: user.name, email: user.email } : address;
  return {
    ...thread,
    folder,
    collectionIds: collectionId ? [collectionId] : thread.collectionIds,
    from: swap(thread.from),
    messages: thread.messages.map((message) => ({
      ...message,
      from: swap(message.from),
      to: message.to.map(swap),
      cc: message.cc?.map(swap),
    })),
  };
}

export function createDemoProvider(
  user: SessionUser,
  account: MailAccount,
): MailProvider & DomainProvider {
  const provider: MailProvider & DomainProvider = {
    account,

    async getMailbox() {
      return {
        email: account.email,
        name: account.displayName,
        connector: account.connector,
      };
    },

    async listThreads(folder, query) {
      await hydrate();
      const sent = await listUserSent(user);
      const threads = [...incoming, ...sent].map((thread) =>
        asOwner(thread, user),
      );
      const pool =
        folder === "smart"
          ? threads.filter(
              (thread) => thread.unread && thread.folder === "inbox",
            )
          : threads.filter((thread) => thread.folder === folder);
      return pageThreads(
        pool.map(toListItem),
        { ...query, unread: folder === "smart" ? undefined : query?.unread },
      );
    },

    async getThread(id: string) {
      await hydrate();
      const sent = await listUserSent(user);
      const found =
        incoming.find((thread) => thread.id === id) ??
        sent.find((thread) => thread.id === id) ??
        null;
      return found ? asOwner(found, user) : null;
    },

    async getFolderCounts() {
      return collectFolderCounts(provider);
    },

    async listCollections() {
      await hydrate();
      const sent = await listUserSent(user);
      const threads = [...incoming, ...sent].map((thread) =>
        asOwner(thread, user),
      );
      return listDemoCollections(user.id)
        .map((collection) => {
          const matchingThreads = threads.filter(
            (thread) => thread.folder === collectionViewId(collection.id),
          );
          return {
            ...collection,
            total: matchingThreads.length,
            unread: matchingThreads.filter((thread) => thread.unread).length,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));
    },

    async createCollection(name: string) {
      const collections = listDemoCollections(user.id);
      if (
        collections.some(
          (collection) =>
            collection.name.localeCompare(name, undefined, {
              sensitivity: "accent",
            }) === 0,
        )
      ) {
        throw new Error("A folder with this name already exists.");
      }
      const collection: MailCollection = {
        id: `demo_${Date.now().toString(36)}`,
        name,
        kind: "folder",
        total: 0,
        unread: 0,
      };
      return saveDemoCollection(user.id, collection);
    },

    async renameCollection(id: string, name: string) {
      const collections = listDemoCollections(user.id);
      const collection = collections.find((item) => item.id === id);
      if (!collection) throw new Error("Folder not found.");
      if (
        collections.some(
          (item) =>
            item.id !== id &&
            item.name.localeCompare(name, undefined, {
              sensitivity: "accent",
            }) === 0,
        )
      ) {
        throw new Error("A folder with this name already exists.");
      }
      return saveDemoCollection(user.id, { ...collection, name });
    },

    async deleteCollection(id: string) {
      return deleteDemoCollection(user.id, id);
    },

    async setThreadCollection(
      id: string,
      collectionId: string,
      selected: boolean,
      fromView: MailViewId,
    ) {
      const collection = listDemoCollections(user.id).find(
        (item) => item.id === collectionId,
      );
      if (!collection) return false;
      await hydrate();
      const sent = await listUserSent(user);
      const thread =
        incoming.find((item) => item.id === id) ??
        sent.find((item) => item.id === id);
      if (!thread) return false;
      const transfer = folderCollectionTransfer(
        collection.id,
        selected,
        fromView,
      );
      const currentFolder = listDemoThreadFolders(user.id)[id] ?? thread.folder;
      if (!selected && currentFolder !== transfer.source) return false;
      saveDemoThreadFolder(user.id, id, transfer.destination);
      return true;
    },

    async getAttachment(id: string) {
      await hydrate();
      const sent = await listUserSent(user);
      for (const thread of [...incoming, ...sent]) {
        const file = thread.messages
          .flatMap((message) => message.attachments)
          .find((attachment) => attachment.id === id);
        if (!file?.content) continue;
        const bytes =
          typeof file.content === "string"
            ? Buffer.from(file.content, "base64")
            : Buffer.from(
                file.content instanceof ArrayBuffer
                  ? new Uint8Array(file.content)
                  : file.content,
              );
        return {
          bytes,
          mimeType: file.mimeType,
          filename: file.filename,
        };
      }
      return null;
    },

    async setThreadUnread(id: string, unread: boolean) {
      await hydrate();
      const sent = await listUserSent(user);
      const thread =
        incoming.find((item) => item.id === id) ??
        sent.find((item) => item.id === id);
      if (!thread) return false;
      thread.unread = unread;
      if (thread.folder === "sent") await saveUserSent(user, thread);
      return true;
    },

    async archiveThread(id: string, fromFolder: string) {
      await hydrate();
      const sent = await listUserSent(user);
      const thread =
        incoming.find((item) => item.id === id) ??
        sent.find((item) => item.id === id);
      if (!thread) return false;
      const currentFolder = listDemoThreadFolders(user.id)[id] ?? thread.folder;
      if (currentFolder === "archived" || fromFolder === "archived") return false;
      thread.folder = "archived";
      saveDemoThreadFolder(user.id, id, "archived");
      if (sent.includes(thread)) await saveUserSent(user, thread);
      return true;
    },

    async setThreadStarred(id: string, starred: boolean) {
      await hydrate();
      const sent = await listUserSent(user);
      const thread =
        incoming.find((item) => item.id === id) ??
        sent.find((item) => item.id === id);
      if (!thread) return false;
      thread.favorite = starred;
      if (sent.includes(thread)) await saveUserSent(user, thread);
      return true;
    },

    async moveThread(
      id: string,
      destination: "inbox" | "spam" | "trash",
      fromFolder: string,
    ) {
      await hydrate();
      const sent = await listUserSent(user);
      const thread =
        incoming.find((item) => item.id === id) ??
        sent.find((item) => item.id === id);
      if (!thread) return false;
      const currentFolder = listDemoThreadFolders(user.id)[id] ?? thread.folder;
      if (currentFolder === destination || fromFolder === destination) return false;
      thread.folder = destination;
      saveDemoThreadFolder(user.id, id, destination);
      if (sent.includes(thread)) await saveUserSent(user, thread);
      return true;
    },

    async send(input: ComposeInput) {
      const now = new Date().toISOString();
      const attachments = (input.attachments ?? []).map((file, index) => ({
        id: `att_${Date.now()}_${index}`,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        content: file.data,
      }));
      const message = {
        id: `msg_${Date.now()}`,
        threadId: "",
        from: { name: user.name, email: user.email },
        to: input.to.split(/[,;]+/).map((value) => ({ name: "", email: value.trim() })).filter((item) => item.email),
        cc: input.cc
          ? input.cc.split(/[,;]+/).map((value) => ({ name: "", email: value.trim() })).filter((item) => item.email)
          : undefined,
        date: now,
        subject: input.subject,
        snippet: input.text.slice(0, 80) || attachments[0]?.filename || "",
        text: input.text,
        html: input.html,
        attachments,
      };

      if (input.inReplyTo) {
        const sent = await listUserSent(user);
        const thread =
          incoming.find((item) => item.messages.some((row) => row.id === input.inReplyTo)) ??
          sent.find((item) => item.messages.some((row) => row.id === input.inReplyTo));
        if (thread) {
          message.threadId = thread.id;
          thread.messages.push(message);
          thread.snippet = message.snippet;
          thread.date = now;
          thread.messageCount = thread.messages.length;
          if (thread.folder === "sent") await saveUserSent(user, thread);
          return { id: message.id, threadId: thread.id, sentAt: now };
        }
      }

      const id = `thr_${Date.now()}`;
      message.threadId = id;
      const thread: ThreadDetail = {
        id,
        folder: "sent",
        subject: input.subject || "(no subject)",
        from: { name: user.name, email: user.email },
        snippet: message.snippet,
        date: now,
        unread: false,
        messageCount: 1,
        messages: [message],
      };
      await saveUserSent(user, thread);
      return { id: message.id, threadId: id, sentAt: now };
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
      const id = `dom_${name.replace(/\W/g, "_")}`;
      const zone = synthesizeZone(name, getMailHostname());
      const records = parseZoneFile(zone);
      const setup: DomainSetup = {
        id,
        name,
        status: "pending",
        records,
        checks: records.map((record) => ({ ...record, ok: false })),
        mailbox: `${mailboxLocalPart}@${name}`,
      };
      if (password) await setMailboxSecret(user, setup.mailbox ?? user.email, password);
      return saveUserDomain(user, setup);
    },

    async verifyDomain(id: string) {
      const current = await getUserDomain(user, id);
      if (!current) throw new Error("Domain not found");
      const checks = await verifyRecords(current.records, current.name);
      const required = summarizeRequiredDnsChecks(checks, current.name);
      const status: DomainSetup["status"] =
        required.ready ? "ok" : required.okCount > 0 ? "partial" : "pending";
      return saveUserDomain(user, {
        ...current,
        checks,
        status,
        lastCheckedAt: new Date().toISOString(),
      });
    },
  };
  return provider;
}
