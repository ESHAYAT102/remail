import type { CollectionIconName } from "./collection-appearance";

export type MailFolderId =
  | "inbox"
  | "smart"
  | "starred"
  | "sent"
  | "drafts"
  | "spam"
  | "trash"
  | "archived";

export type MailCollectionKind = "folder" | "label";

export type MailCollection = {
  id: string;
  name: string;
  kind: MailCollectionKind;
  icon?: CollectionIconName;
  color?: string;
  total?: number;
  unread?: number;
};

export type MailCollectionViewId = `collection:${string}`;
export type MailViewId = MailFolderId | MailCollectionViewId;

export type MailConnectorId = "hosted";

export type MailCapability =
  | "read"
  | "send"
  | "drafts"
  | "markUnread"
  | "star"
  | "archive"
  | "spam"
  | "trash"
  | "attachments"
  | "collections"
  | "sort"
  | "pushSync";

export type MailAccount = {
  id: string;
  connector: MailConnectorId;
  email: string;
  displayName: string;
  image?: string | null;
  status: "connected" | "setup" | "reauthorize";
  capabilities: MailCapability[];
  syncRevision: number;
};

export type Address = {
  name: string;
  email: string;
};

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  inline?: boolean;
  content?: ArrayBuffer | Uint8Array | string;
};

export type ComposeAttachment = {
  filename: string;
  mimeType: string;
  size: number;
  data: string;
};

export type Message = {
  id: string;
  threadId: string;
  from: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  date: string;
  subject: string;
  snippet: string;
  text?: string;
  html?: string;
  attachments: Attachment[];
};

export type Thread = {
  id: string;
  draftId?: string;
  folder: MailFolderId | string;
  subject: string;
  from: Address;
  snippet: string;
  date: string;
  unread: boolean;
  favorite?: boolean;
  collectionIds?: string[];
  hasAttachment?: boolean;
  messageCount: number;
};

export type ThreadSort = "date" | "from" | "subject";

export type ThreadListQuery = {
  q?: string;
  unread?: boolean;
  hasAttachment?: boolean;
  sort?: ThreadSort;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type ThreadListPage = {
  threads: Thread[];
  total: number;
  unread: number;
  hasMore: boolean;
};

export type FolderCounts = Record<MailFolderId, number>;

export type ThreadDetail = Thread & {
  messages: Message[];
};

export type ComposeInput = {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  threadId?: string;
  draftId?: string;
  attachments?: ComposeAttachment[];
};

export type DraftInput = Omit<ComposeInput, "draftId"> & {
  id?: string;
};

export type MailAttachmentDownload = {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
};

export type SendResult = {
  id: string;
  threadId: string;
  sentAt: string;
};

export type DnsRecord = {
  type: "MX" | "TXT" | "CNAME" | "A" | "AAAA";
  host: string;
  value: string;
  priority?: number;
};

export type DnsCheck = DnsRecord & {
  ok: boolean;
  observed?: string;
  observedHost?: string;
  mismatch?: "host" | "value" | "host-and-value";
  conflict?: "spf" | "dmarc";
};

export type DomainSetup = {
  id: string;
  name: string;
  status: "pending" | "partial" | "ok";
  records: DnsRecord[];
  checks: DnsCheck[];
  mailbox?: string;
  lastCheckedAt?: string;
};

export type MailboxInfo = {
  email: string;
  name: string;
  connector?: MailConnectorId;
};
