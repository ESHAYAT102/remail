import type {
  ComposeInput,
  DraftInput,
  DomainSetup,
  FolderCounts,
  MailAccount,
  MailAttachmentDownload,
  MailCollection,
  MailViewId,
  MailboxInfo,
  ThreadDetail,
  ThreadListPage,
  ThreadListQuery,
  SendResult,
} from "./types";

export interface MailProvider {
  readonly account: MailAccount;
  getMailbox(): Promise<MailboxInfo>;
  listThreads(
    folder: MailViewId,
    query?: ThreadListQuery,
  ): Promise<ThreadListPage>;
  getThread(id: string): Promise<ThreadDetail | null>;
  getFolderCounts(): Promise<FolderCounts>;
  listCollections(): Promise<MailCollection[]>;
  createCollection(name: string): Promise<MailCollection>;
  renameCollection(id: string, name: string): Promise<MailCollection>;
  deleteCollection(id: string): Promise<boolean>;
  setThreadCollection(
    id: string,
    collectionId: string,
    selected: boolean,
    fromView: MailViewId,
  ): Promise<boolean>;
  getAttachment(id: string, filename?: string): Promise<MailAttachmentDownload | null>;
  setThreadUnread(id: string, unread: boolean): Promise<boolean>;
  setThreadStarred(id: string, starred: boolean): Promise<boolean>;
  archiveThread(id: string, fromFolder: MailViewId): Promise<boolean>;
  moveThread(
    id: string,
    destination: "inbox" | "spam" | "trash",
    fromFolder: MailViewId,
  ): Promise<boolean>;
  send(input: ComposeInput): Promise<SendResult>;
  saveDraft(input: DraftInput): Promise<{ id: string }>;
  deleteDraft(id: string): Promise<boolean>;
}

export interface DomainProvider {
  listDomains(): Promise<DomainSetup[]>;
  addDomain(
    name: string,
    mailboxLocalPart: string,
    password?: string,
  ): Promise<DomainSetup>;
  verifyDomain(id: string): Promise<DomainSetup>;
}
