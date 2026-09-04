import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"),
  density: text("density").notNull().default("comfortable"),
  loadRemoteImages: boolean("load_remote_images").notNull().default(true),
  includeRedaktFooter: boolean("include_redakt_footer").notNull().default(true),
  singleKeyShortcuts: boolean("single_key_shortcuts").notNull().default(true),
  messagePreview: text("message_preview").notNull().default("one"),
  defaultSenderAlias: text("default_sender_alias").notNull().default(""),
  defaultFolder: text("default_folder").notNull().default("inbox"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const composeAttachmentChunks = pgTable(
  "compose_attachment_chunks",
  {
    uploadId: text("upload_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: text("data").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("compose_attachment_chunk_unique").on(
      table.uploadId,
      table.chunkIndex,
    ),
    index("compose_attachment_chunk_user_idx").on(table.userId),
  ],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("account_issuer_accountId_uidx").on(table.issuer, table.accountId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mailCollectionAppearances = pgTable(
  "mail_collection_appearances",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    collectionId: text("collection_id").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mail_collection_appearances_owner_uidx").on(
      table.userId,
      table.accountId,
      table.collectionId,
    ),
  ],
);

export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  stalwartId: text("stalwart_id"),
  zoneCache: text("zone_cache"),
  lastCheckedAt: timestamp("last_checked_at"),
  okCount: integer("ok_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("domains_name_uidx").on(table.name)]);

export const mailboxes = pgTable("mailboxes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  secret: text("secret").notNull(),
  stalwartAccountId: text("stalwart_account_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resendCredentials = pgTable("resend_credentials", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  apiKey: text("api_key").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dnsChecks = pgTable("dns_checks", {
  id: text("id").primaryKey(),
  domainId: text("domain_id")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),
  records: jsonb("records").notNull(),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

export const hostedMessages = pgTable(
  "hosted_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    providerEmailId: text("provider_email_id").notNull(),
    messageId: text("message_id"),
    threadId: text("thread_id").notNull(),
    direction: text("direction").notNull(),
    folder: text("folder").notNull(),
    unread: boolean("unread").notNull().default(true),
    from: jsonb("from").notNull(),
    to: jsonb("to").notNull(),
    cc: jsonb("cc").notNull().default([]),
    bcc: jsonb("bcc").notNull().default([]),
    replyTo: jsonb("reply_to").notNull().default([]),
    subject: text("subject").notNull().default(""),
    text: text("text"),
    html: text("html"),
    headers: jsonb("headers").notNull().default({}),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("hosted_messages_provider_email_uidx").on(table.providerEmailId),
    index("hosted_messages_user_thread_idx").on(table.userId, table.threadId),
    index("hosted_messages_user_folder_idx").on(table.userId, table.folder),
  ],
);

export const hostedAttachments = pgTable("hosted_attachments", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => hostedMessages.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  contentId: text("content_id"),
  inline: boolean("inline").notNull().default(false),
  content: text("content").notNull(),
});

export const hostedCollections = pgTable(
  "hosted_collections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("hosted_collections_user_name_uidx").on(table.userId, table.name),
  ],
);
