import "server-only";

import type { MailProvider } from "@/lib/mail/provider";
import type {
  DraftInput,
  FolderCounts,
  MailAccount,
  MailCollection,
  MailFolderId,
  MailViewId,
  ThreadListPage,
  ThreadListQuery,
} from "@/lib/mail/types";
import { GmailClient } from "./client";
import { buildGmailRawMessage } from "./mime";
import {
  decodeGmailAttachmentId,
  gmailHeaderValue,
  gmailThreadToDetail,
  gmailThreadToSummary,
} from "./normalize";
import {
  gmailFolderQueries,
  gmailQuery,
  hydrateGmailThreadBodies,
  listGmailReferences,
  sortGmailThreads,
} from "./provider-core";
import { collectionIdFromView } from "@/lib/mail/routes";

const labelIds: Partial<Record<MailFolderId, string>> = {
  inbox: "INBOX",
  starred: "STARRED",
  sent: "SENT",
  drafts: "DRAFT",
  spam: "SPAM",
  trash: "TRASH",
};

function draftId(value: string) {
  return value.startsWith("draft:") ? value.slice(6) : value;
}

export class GmailProvider implements MailProvider {
  constructor(
    readonly account: MailAccount,
    private readonly client: GmailClient,
  ) {}

  async getMailbox() {
    return {
      email: this.account.email,
      name: this.account.displayName,
      connector: this.account.connector,
    };
  }

  async listThreads(
    folder: MailViewId,
    query: ThreadListQuery = {},
  ): Promise<ThreadListPage> {
    if (folder === "drafts") return this.listDrafts(query);

    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const offset = Math.max(0, query.offset ?? 0);
    const collectionId = collectionIdFromView(folder);
    const listed = await this.listThreadReferences(
      gmailQuery(folder, query),
      offset + limit,
      collectionId ? [collectionId] : undefined,
    );
    const selected = listed.ids.slice(offset, offset + limit);
    const [hydrated, unreadResult] = await Promise.all([
      Promise.all(
        selected.map((id) => this.client.getThread(id, "metadata")),
      ),
      folder === "smart"
        ? Promise.resolve({ resultSizeEstimate: listed.estimate })
        : this.client.listThreads({
            q: `${gmailQuery(folder, query)} is:unread`,
            labelIds: collectionId ? [collectionId] : undefined,
            maxResults: 1,
          }),
    ]);
    const threads = sortGmailThreads(
      hydrated.map((thread) => gmailThreadToSummary(thread, folder)),
      query,
    );
    const unread = unreadResult.resultSizeEstimate ?? 0;

    return {
      threads,
      total: listed.estimate,
      unread,
      hasMore: offset + threads.length < listed.estimate || listed.hasMore,
    };
  }

  async getThread(id: string) {
    if (id.startsWith("draft:")) {
      const draft = await this.client.getDraft(draftId(id), "full");
      const thread = await hydrateGmailThreadBodies({
        id: draft.message.threadId,
        messages: [draft.message],
      }, (messageId, attachmentId) =>
        this.client.getAttachment(messageId, attachmentId),
      );
      const detail = gmailThreadToDetail(thread, "drafts", draft.id);
      if (detail) await this.hydrateAttachments(detail, true);
      return detail;
    }

    const thread = await hydrateGmailThreadBodies(
      await this.client.getThread(id, "full"),
      (messageId, attachmentId) =>
        this.client.getAttachment(messageId, attachmentId),
    );
    const detail = gmailThreadToDetail(thread);
    if (!detail) return null;
    await this.hydrateAttachments(detail, false);
    return detail;
  }

  private async hydrateAttachments(
    detail: NonNullable<Awaited<ReturnType<MailProvider["getThread"]>>>,
    includeFiles: boolean,
  ) {
    await Promise.all(
      detail.messages.flatMap((message) =>
        message.attachments
          .filter(
            (attachment) =>
              (includeFiles || attachment.inline) && !attachment.content,
          )
          .map(async (attachment) => {
            const value = decodeGmailAttachmentId(attachment.id);
            if (!value) return;
            try {
              const payload = await this.client.getAttachment(
                value.messageId,
                value.attachmentId,
              );
              attachment.content = Buffer.from(payload.data, "base64url");
            } catch (error) {
              if (includeFiles) throw error;
              // The message remains readable if an inline part is unavailable.
            }
          }),
      ),
    );
  }

  async getFolderCounts(): Promise<FolderCounts> {
    const [labels, archived] = await Promise.all([
      Promise.all(
        Object.entries(labelIds).map(async ([folder, label]) => {
          const result = await this.client.getLabel(label);
          return [folder, result] as const;
        }),
      ),
      this.client.listThreads({
        q: gmailFolderQueries.archived,
        maxResults: 1,
      }),
    ]);
    const entries = labels.map(([folder, result]) => [
      folder,
      result.threadsTotal ?? result.messagesTotal ?? 0,
    ]);
    const inbox = labels.find(([folder]) => folder === "inbox")?.[1];
    return {
      inbox: 0,
      smart: inbox?.threadsUnread ?? inbox?.messagesUnread ?? 0,
      starred: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      archived: archived.resultSizeEstimate ?? 0,
      ...Object.fromEntries(entries),
    };
  }

  async listCollections(): Promise<MailCollection[]> {
    const response = await this.client.listLabels();
    return (response.labels ?? [])
      .filter((label) => label.type === "user")
      .map((label) => ({
        id: label.id,
        name: label.name,
        kind: "label" as const,
        total: label.threadsTotal,
        unread: label.threadsUnread,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async createCollection(name: string): Promise<MailCollection> {
    const existing = await this.listCollections();
    if (existing.some((label) => label.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
      throw new Error("A label with this name already exists.");
    }
    const label = await this.client.createLabel(name);
    return { id: label.id, name: label.name, kind: "label" };
  }

  async renameCollection(id: string, name: string): Promise<MailCollection> {
    const labels = await this.listCollections();
    const label = labels.find((item) => item.id === id);
    if (!label) throw new Error("Label not found.");
    if (
      labels.some(
        (item) =>
          item.id !== id &&
          item.name.localeCompare(name, undefined, {
            sensitivity: "accent",
          }) === 0,
      )
    ) {
      throw new Error("A label with this name already exists.");
    }
    const updated = await this.client.updateLabel(id, name);
    return { ...label, name: updated.name };
  }

  async deleteCollection(id: string) {
    const labels = await this.listCollections();
    if (!labels.some((label) => label.id === id)) return false;
    await this.client.deleteLabel(id);
    return true;
  }

  async setThreadCollection(
    id: string,
    collectionId: string,
    selected: boolean,
  ) {
    const labels = await this.listCollections();
    if (!labels.some((label) => label.id === collectionId)) return false;
    await this.client.modifyThread(id, {
      addLabelIds: selected ? [collectionId] : undefined,
      removeLabelIds: selected ? undefined : [collectionId],
    });
    return true;
  }

  async getAttachment(id: string, filename = "attachment") {
    const value = decodeGmailAttachmentId(id);
    if (!value) return null;
    const payload = await this.client.getAttachment(
      value.messageId,
      value.attachmentId,
    );
    return {
      bytes: Buffer.from(payload.data, "base64url"),
      mimeType: value.mimeType,
      filename: value.filename || filename,
    };
  }

  async setThreadUnread(id: string, unread: boolean) {
    await this.client.modifyThread(id, {
      addLabelIds: unread ? ["UNREAD"] : undefined,
      removeLabelIds: unread ? undefined : ["UNREAD"],
    });
    return true;
  }

  async setThreadStarred(id: string, starred: boolean) {
    await this.client.modifyThread(id, {
      addLabelIds: starred ? ["STARRED"] : undefined,
      removeLabelIds: starred ? undefined : ["STARRED"],
    });
    return true;
  }

  async archiveThread(id: string) {
    await this.client.modifyThread(id, { removeLabelIds: ["INBOX"] });
    return true;
  }

  async moveThread(
    id: string,
    destination: "inbox" | "spam" | "trash",
  ) {
    if (destination === "trash") {
      await this.client.trashThread(id);
      return true;
    }
    if (destination === "inbox") {
      await this.client.untrashThread(id).catch(() => undefined);
      await this.client.modifyThread(id, {
        addLabelIds: ["INBOX"],
        removeLabelIds: ["SPAM"],
      });
      return true;
    }
    await this.client.modifyThread(id, {
      addLabelIds: ["SPAM"],
      removeLabelIds: ["INBOX"],
    });
    return true;
  }

  async send(input: DraftInput & { draftId?: string }) {
    const message = await this.rawMessage(input);
    if (input.draftId) {
      const id = draftId(input.draftId);
      await this.client.updateDraft(id, message.raw, message.threadId);
      const sent = await this.client.sendDraft(id);
      return {
        id: sent.id,
        threadId: sent.threadId || sent.id,
        sentAt: new Date().toISOString(),
      };
    }
    const sent = await this.client.sendRaw(message.raw, message.threadId);
    return {
      id: sent.id,
      threadId: sent.threadId || sent.id,
      sentAt: new Date().toISOString(),
    };
  }

  async saveDraft(input: DraftInput) {
    const message = await this.rawMessage(input);
    const saved = input.id
      ? await this.client.updateDraft(
          draftId(input.id),
          message.raw,
          message.threadId,
        )
      : await this.client.createDraft(message.raw, message.threadId);
    return { id: `draft:${saved.id}` };
  }

  async deleteDraft(id: string) {
    await this.client.deleteDraft(draftId(id));
    return true;
  }

  private async listDrafts(query: ThreadListQuery): Promise<ThreadListPage> {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const offset = Math.max(0, query.offset ?? 0);
    const listed = await this.listDraftReferences(
      gmailQuery("drafts", query),
      offset + limit,
    );
    const drafts = await Promise.all(
      listed.ids
        .slice(offset, offset + limit)
        .map((id) => this.client.getDraft(id, "metadata")),
    );
    const threads = sortGmailThreads(
      drafts.map((draft) =>
        gmailThreadToSummary(
          {
            id: draft.message.threadId,
            messages: [draft.message],
          },
          "drafts",
          draft.id,
        ),
      ),
      query,
    );
    return {
      threads,
      total: listed.estimate,
      unread: 0,
      hasMore: offset + threads.length < listed.estimate || listed.hasMore,
    };
  }

  private async listThreadReferences(
    q: string,
    take: number,
    customLabelIds?: string[],
  ) {
    return listGmailReferences(take, async (input) => {
      const page = await this.client.listThreads({
        q,
        labelIds: customLabelIds,
        ...input,
      });
      return { ...page, references: page.threads };
    });
  }

  private async listDraftReferences(q: string, take: number) {
    return listGmailReferences(take, async (input) => {
      const page = await this.client.listDrafts({ q, ...input });
      return { ...page, references: page.drafts };
    });
  }

  private async rawMessage(input: DraftInput & { draftId?: string }) {
    if (!input.inReplyTo) {
      return buildGmailRawMessage(
        { name: this.account.displayName, email: this.account.email },
        input,
      );
    }
    const original = await this.client.getMessage(input.inReplyTo, "metadata");
    const messageId = gmailHeaderValue(original.payload?.headers, "Message-ID");
    const references = gmailHeaderValue(original.payload?.headers, "References");
    return buildGmailRawMessage(
      { name: this.account.displayName, email: this.account.email },
      input,
      {
        messageId,
        references: [references, messageId].filter(Boolean).join(" "),
        threadId: original.threadId,
      },
    );
  }
}
