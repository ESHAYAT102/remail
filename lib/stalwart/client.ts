import { getStalwartConfig } from "../env.ts";
import type { Address } from "@/lib/mail/types";

type JmapInvocation = [string, Record<string, unknown>, string];

type JmapResponse = {
  methodResponses: Array<[string, Record<string, unknown>, string]>;
};

type JmapSession = {
  apiUrl?: string;
  downloadUrl?: string;
  uploadUrl?: string;
  accounts?: Record<string, { name?: string }>;
  primaryAccounts?: Record<string, string>;
};

type JmapMailbox = {
  id: string;
  role?: string | null;
  name?: string;
  totalEmails?: number;
  unreadEmails?: number;
  totalThreads?: number;
  unreadThreads?: number;
};

type EmailQueryOptions = {
  mailboxId?: string;
  unreadOnly?: boolean;
  keyword?: string;
  text?: string;
  hasAttachment?: boolean;
  sort?: "receivedAt" | "from" | "subject";
  ascending?: boolean;
  collapseThreads?: boolean;
  limit?: number;
  position?: number;
};

const emailSummaryProperties = [
  "id",
  "threadId",
  "from",
  "subject",
  "receivedAt",
  "preview",
  "attachments",
  "mailboxIds",
  "keywords",
];

const emailDetailProperties = [
  "id",
  "threadId",
  "from",
  "to",
  "cc",
  "subject",
  "receivedAt",
  "preview",
  "textBody",
  "htmlBody",
  "bodyValues",
  "attachments",
  "mailboxIds",
  "keywords",
  "messageId",
  "inReplyTo",
  "references",
];

export class StalwartClient {
  private session: JmapSession | null = null;
  private connectPromise: Promise<JmapSession> | null = null;
  private readonly mailboxRequests = new Map<
    string,
    Promise<JmapMailbox[]>
  >();
  private apiUrl = "";
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  static fromEnv() {
    const { url, adminUser, adminSecret } = getStalwartConfig();
    return new StalwartClient(url, adminUser, adminSecret);
  }

  static forMailbox(email: string, password: string) {
    const { url } = getStalwartConfig();
    return new StalwartClient(url, email, password);
  }

  private authHeader() {
    return `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
  }

  async connect() {
    if (this.session) return this.session;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.loadSession().catch((error) => {
      this.connectPromise = null;
      throw error;
    });
    return this.connectPromise;
  }

  private async loadSession() {
    const res = await fetch(new URL("/.well-known/jmap", this.baseUrl), {
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok) {
      throw new Error(`Stalwart session failed (${res.status})`);
    }
    this.session = (await res.json()) as JmapSession;
    this.apiUrl = String(this.session.apiUrl ?? `${this.baseUrl}/jmap`);
    return this.session;
  }

  mailAccountId() {
    const session = this.session;
    if (!session) return "";
    return (
      session.primaryAccounts?.["urn:ietf:params:jmap:mail"] ??
      Object.keys(session.accounts ?? {})[0] ??
      ""
    );
  }

  private expandUrl(template: string, values: Record<string, string>) {
    return template.replace(/\{[?+]?(\w+)\}/g, (_, key: string) =>
      encodeURIComponent(values[key] ?? ""),
    );
  }

  async upload(accountId: string, bytes: Uint8Array, type: string) {
    const session = await this.connect();
    const url = this.expandUrl(
      session.uploadUrl ?? `${this.baseUrl}/upload/{accountId}`,
      { accountId },
    );
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": type || "application/octet-stream",
      },
      body: Buffer.from(bytes),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return (await res.json()) as { blobId: string; type?: string; size?: number };
  }

  async download(accountId: string, blobId: string, name = "file") {
    const session = await this.connect();
    const url = this.expandUrl(
      session.downloadUrl ?? `${this.baseUrl}/download/{accountId}/{blobId}/{name}`,
      { accountId, blobId, name, type: "application/octet-stream" },
    );
    const res = await fetch(url, { headers: { Authorization: this.authHeader() } });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      type: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async request(
    using: string[],
    methodCalls: JmapInvocation[],
    options?: { management?: boolean },
  ): Promise<JmapResponse> {
    await this.connect();
    const url = options?.management ? `${this.baseUrl.replace(/\/$/, "")}/api` : this.apiUrl;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ using, methodCalls }),
    });
    if (options?.management && (res.status === 404 || res.status === 405)) {
      return this.request(using, methodCalls);
    }
    if (!res.ok) {
      throw new Error(`JMAP request failed (${res.status})`);
    }
    return (await res.json()) as JmapResponse;
  }

  first<T>(response: JmapResponse) {
    const payload = response.methodResponses[0]?.[1] as T & {
      type?: string;
      description?: string;
    };
    if (
      payload &&
      "type" in payload &&
      (String(payload.type).endsWith("Error") || payload.type === "unknownMethod")
    ) {
      throw new Error(payload.description || JSON.stringify(payload));
    }
    return payload as T;
  }

  private responseFor<T>(response: JmapResponse, callId: string) {
    const methodResponse = response.methodResponses.find(
      ([, , responseCallId]) => responseCallId === callId,
    );
    const payload = methodResponse?.[1] as
      | (T & { type?: string; description?: string })
      | undefined;
    if (!payload) throw new Error(`JMAP response missing call ${callId}`);
    if (
      methodResponse?.[0] === "error" ||
      ("type" in payload &&
        (String(payload.type).endsWith("Error") || payload.type === "unknownMethod"))
    ) {
      throw new Error(payload.description || JSON.stringify(payload));
    }
    return payload as T;
  }

  async createDomain(name: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [
        [
          "x:Domain/set",
          {
            create: {
              new1: {
                name,
                aliases: {},
                certificateManagement: { "@type": "Manual" },
                dkimManagement: { "@type": "Automatic" },
                dnsManagement: { "@type": "Manual" },
                subAddressing: { "@type": "Enabled" },
              },
            },
          },
          "c1",
        ],
      ],
      { management: true },
    );
    return this.first<{ created?: Record<string, { id: string; dnsZoneFile?: string }> }>(
      response,
    );
  }

  async queryDomain(name: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [["x:Domain/query", { filter: { name } }, "c1"]],
      { management: true },
    );
    return this.first<{ ids?: string[] }>(response);
  }

  async queryAccounts(domainId: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [["x:Account/query", { filter: { domainId } }, "c1"]],
      { management: true },
    );
    return this.first<{ ids?: string[] }>(response);
  }

  async getAccounts(ids: string[]) {
    if (ids.length === 0) return { list: [] };
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [["x:Account/get", { ids }, "c1"]],
      { management: true },
    );
    return this.first<{ list?: Array<{ id: string }> }>(response);
  }

  async queryDkimSignatures(domainId: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [["x:DkimSignature/query", { filter: { domainId } }, "c1"]],
      { management: true },
    );
    return this.first<{ ids?: string[] }>(response);
  }

  private async destroyObjects(
    type: "Account" | "DkimSignature" | "Domain",
    ids: string[],
  ) {
    if (ids.length === 0) return;
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [[`x:${type}/set`, { destroy: ids }, "c1"]],
      { management: true },
    );
    const payload = this.first<{
      destroyed?: string[];
      notDestroyed?: Record<string, { type?: string; description?: string }>;
    }>(response);
    const failures = payload.notDestroyed ?? {};
    const failure = Object.values(failures).find((item) => item.type !== "notFound");
    if (failure) {
      throw new Error(failure.description || `Unable to delete this ${type.toLowerCase()}.`);
    }
    const destroyed = new Set(payload.destroyed ?? []);
    const alreadyRemoved = new Set(
      Object.entries(failures)
        .filter(([, item]) => item.type === "notFound")
        .map(([id]) => id),
    );
    if (ids.some((id) => !destroyed.has(id) && !alreadyRemoved.has(id))) {
      throw new Error(`Unable to delete this ${type.toLowerCase()}.`);
    }
  }

  async deleteAccounts(ids: string[]) {
    return this.destroyObjects("Account", ids);
  }

  async deleteDkimSignatures(ids: string[]) {
    return this.destroyObjects("DkimSignature", ids);
  }

  async deleteDomains(ids: string[]) {
    return this.destroyObjects("Domain", ids);
  }

  async getDomain(id: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [["x:Domain/get", { ids: [id] }, "c1"]],
      { management: true },
    );
    return this.first<{ list?: Array<{ id: string; name: string; dnsZoneFile?: string }> }>(
      response,
    );
  }

  async createAccount(name: string, domainId: string, password: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
      [
        [
          "x:Account/set",
          {
            create: {
              new1: {
                "@type": "User",
                name,
                domainId,
                credentials: { "0": { "@type": "Password", secret: password } },
                aliases: {},
                memberGroupIds: {},
                roles: { "@type": "User" },
                permissions: { "@type": "Inherit" },
                quotas: {},
                encryptionAtRest: { "@type": "Disabled" },
              },
            },
          },
          "c1",
        ],
      ],
      { management: true },
    );
    const payload = this.first<{
      created?: Record<string, { id: string }>;
      notCreated?: Record<string, { description?: string }>;
    }>(response);
    const failed = payload.notCreated?.new1;
    if (failed) {
      throw new Error(failed.description || "Unable to create this mailbox.");
    }
    if (!payload.created?.new1?.id) {
      throw new Error("Unable to create this mailbox.");
    }
    return payload;
  }

  async listMailboxes(accountId: string) {
    const cached = this.mailboxRequests.get(accountId);
    if (cached) return cached;
    const request = this.fetchMailboxes(accountId).catch((error) => {
      this.mailboxRequests.delete(accountId);
      throw error;
    });
    this.mailboxRequests.set(accountId, request);
    return request;
  }

  private async fetchMailboxes(accountId: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        ["Mailbox/query", { accountId }, "c1"],
        [
          "Mailbox/get",
          {
            accountId,
            "#ids": {
              resultOf: "c1",
              name: "Mailbox/query",
              path: "/ids",
            },
          },
          "c2",
        ],
      ],
    );
    const get = this.responseFor<{ list?: JmapMailbox[] }>(response, "c2");
    return get.list ?? [];
  }

  private emailQueryArgs(accountId: string, options: EmailQueryOptions) {
    const conditions = [
      options.mailboxId ? { inMailbox: options.mailboxId } : null,
      options.unreadOnly ? { notKeyword: "$seen" } : null,
      options.keyword ? { hasKeyword: options.keyword } : null,
      options.text?.trim() ? { text: options.text.trim() } : null,
      options.hasAttachment ? { hasAttachment: true } : null,
    ].filter(Boolean);
    return {
      accountId,
      filter:
        conditions.length > 1
          ? { operator: "AND", conditions }
          : (conditions[0] ?? undefined),
      sort: [
        {
          property: options.sort ?? "receivedAt",
          isAscending: Boolean(options.ascending),
        },
      ],
      collapseThreads: options.collapseThreads ?? true,
      calculateTotal: true,
      limit: options.limit ?? 20,
      position: options.position ?? 0,
    };
  }

  async queryEmails(
    accountId: string,
    options: EmailQueryOptions = {},
  ) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/query",
          this.emailQueryArgs(accountId, options),
          "c1",
        ],
      ],
    );
    return this.first<{ ids?: string[]; total?: number; position?: number }>(response);
  }

  async listEmails(accountId: string, options: EmailQueryOptions = {}) {
    const methodCalls: JmapInvocation[] = [
      ["Email/query", this.emailQueryArgs(accountId, options), "page"],
      [
        "Email/get",
        {
          accountId,
          "#ids": {
            resultOf: "page",
            name: "Email/query",
            path: "/ids",
          },
          properties: emailSummaryProperties,
        },
        "emails",
      ],
    ];
    if (!options.unreadOnly) {
      methodCalls.push([
        "Email/query",
        this.emailQueryArgs(accountId, {
          ...options,
          unreadOnly: true,
          limit: 1,
          position: 0,
        }),
        "unread",
      ]);
    }
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      methodCalls,
    );
    const page = this.responseFor<{
      ids?: string[];
      total?: number;
      position?: number;
    }>(response, "page");
    const emails = this.responseFor<{
      list?: Array<Record<string, unknown>>;
    }>(response, "emails");
    const unread = options.unreadOnly
      ? { total: page.total }
      : this.responseFor<{ total?: number }>(response, "unread");
    return { page, emails, unread };
  }

  async queryThreadEmails(accountId: string, threadId: string) {
    try {
      const thread = await this.request(
        ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
        [["Thread/get", { accountId, ids: [threadId] }, "c1"]],
      );
      const fromThread = this.first<{ list?: Array<{ emailIds?: string[] }> }>(thread);
      const emailIds = fromThread.list?.[0]?.emailIds;
      if (emailIds?.length) return { ids: emailIds };
    } catch {
      // Fall back to Email/query.
    }

    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/query",
          {
            accountId,
            filter: { inThread: threadId },
            sort: [{ property: "receivedAt", isAscending: true }],
          },
          "c1",
        ],
      ],
    );
    return this.first<{ ids?: string[] }>(response);
  }

  async getThreadEmails(accountId: string, threadId: string) {
    try {
      const response = await this.request(
        ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
        [
          ["Thread/get", { accountId, ids: [threadId] }, "thread"],
          [
            "Email/get",
            {
              accountId,
              "#ids": {
                resultOf: "thread",
                name: "Thread/get",
                path: "/list/0/emailIds",
              },
              properties: emailDetailProperties,
              fetchTextBodyValues: true,
              fetchHTMLBodyValues: true,
            },
            "emails",
          ],
        ],
      );
      const thread = this.responseFor<{
        list?: Array<{ emailIds?: string[] }>;
      }>(response, "thread");
      const emails = this.responseFor<{
        list?: Array<Record<string, unknown>>;
      }>(response, "emails");
      if (thread.list?.[0]?.emailIds?.length && emails.list?.length) {
        return emails;
      }
    } catch {
      // Some callers still have an email id from older URLs. Resolve it below.
    }

    const fallback = await this.getEmails(accountId, [threadId]);
    const email = fallback.list?.[0] as
      | { id?: string; threadId?: string }
      | undefined;
    if (!email) return { list: [] };
    const ids = email.threadId
      ? (await this.queryThreadEmails(accountId, email.threadId)).ids ?? []
      : email.id
        ? [email.id]
        : [];
    return ids.length ? this.getEmails(accountId, ids) : { list: [] };
  }

  async getEmails(accountId: string, ids: string[]) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/get",
          {
            accountId,
            ids,
            properties: emailDetailProperties,
            fetchTextBodyValues: true,
            fetchHTMLBodyValues: true,
          },
          "c1",
        ],
      ],
    );
    return this.first<{ list?: Array<Record<string, unknown>> }>(response);
  }

  async setEmailsSeen(accountId: string, ids: string[], seen: boolean) {
    if (ids.length === 0) return false;
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/set",
          {
            accountId,
            update: Object.fromEntries(
              ids.map((id) => [id, { "keywords/$seen": seen ? true : null }]),
            ),
          },
          "c1",
        ],
      ],
    );
    const payload = this.first<{
      updated?: Record<string, null>;
      notUpdated?: Record<string, { description?: string }>;
    }>(response);
    const failure = Object.values(payload.notUpdated ?? {})[0];
    if (failure) throw new Error(failure.description || "Unable to update this thread.");
    return ids.every((id) => id in (payload.updated ?? {}));
  }

  async moveEmails(
    accountId: string,
    ids: string[],
    fromMailboxId: string,
    toMailboxId: string,
  ) {
    if (ids.length === 0) return false;
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/set",
          {
            accountId,
            update: Object.fromEntries(
              ids.map((id) => [
                id,
                {
                  [`mailboxIds/${fromMailboxId}`]: null,
                  [`mailboxIds/${toMailboxId}`]: true,
                },
              ]),
            ),
          },
          "c1",
        ],
      ],
    );
    const payload = this.first<{
      updated?: Record<string, null>;
      notUpdated?: Record<string, { description?: string }>;
    }>(response);
    const failure = Object.values(payload.notUpdated ?? {})[0];
    if (failure) throw new Error(failure.description || "Unable to archive this thread.");
    return ids.every((id) => id in (payload.updated ?? {}));
  }

  async createMailbox(accountId: string, name: string, role?: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Mailbox/set",
          {
            accountId,
            create: { mailbox1: role ? { name, role } : { name } },
          },
          "c1",
        ],
      ],
    );
    const payload = this.first<{
      created?: Record<string, { id: string }>;
      notCreated?: Record<string, { description?: string }>;
    }>(response);
    const failure = payload.notCreated?.mailbox1;
    if (failure) throw new Error(failure.description || "Unable to create this folder.");
    const id = payload.created?.mailbox1?.id ?? "";
    if (id) this.mailboxRequests.delete(accountId);
    return id;
  }

  async renameMailbox(accountId: string, id: string, name: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Mailbox/set", { accountId, update: { [id]: { name } } }, "c1"]],
    );
    const payload = this.first<{
      updated?: Record<string, null>;
      notUpdated?: Record<string, { description?: string }>;
    }>(response);
    const failure = payload.notUpdated?.[id];
    if (failure) {
      throw new Error(failure.description || "Unable to rename this folder.");
    }
    const updated = id in (payload.updated ?? {});
    if (updated) this.mailboxRequests.delete(accountId);
    return updated;
  }

  async deleteMailbox(accountId: string, id: string) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Mailbox/set", { accountId, destroy: [id] }, "c1"]],
    );
    const payload = this.first<{
      destroyed?: string[];
      notDestroyed?: Record<string, { description?: string }>;
    }>(response);
    const failure = payload.notDestroyed?.[id];
    if (failure) {
      throw new Error(failure.description || "Unable to delete this folder.");
    }
    const deleted = payload.destroyed?.includes(id) ?? false;
    if (deleted) this.mailboxRequests.delete(accountId);
    return deleted;
  }

  async listIdentities(accountId: string) {
    const response = await this.request(
      [
        "urn:ietf:params:jmap:core",
        "urn:ietf:params:jmap:mail",
        "urn:ietf:params:jmap:submission",
      ],
      [["Identity/get", { accountId }, "c1"]],
    );
    return this.first<{ list?: Array<{ id: string; email?: string; name?: string }> }>(response);
  }

  async createIdentity(accountId: string, from: Address) {
    const response = await this.request(
      [
        "urn:ietf:params:jmap:core",
        "urn:ietf:params:jmap:mail",
        "urn:ietf:params:jmap:submission",
      ],
      [
        [
          "Identity/set",
          {
            accountId,
            create: {
              id1: {
                name: from.name || from.email,
                email: from.email,
              },
            },
          },
          "c1",
        ],
      ],
    );
    return this.first<{ created?: Record<string, { id: string }> }>(response);
  }

  async createDraft(
    accountId: string,
    mailboxId: string,
    input: {
      from: Address;
      to: Address[];
      cc?: Address[];
      bcc?: Address[];
      subject: string;
      text: string;
      html?: string;
      inReplyTo?: string[];
      references?: string[];
      attachments?: Array<{ blobId: string; type: string; name: string; size: number }>;
    },
  ) {
    const response = await this.request(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        [
          "Email/set",
          {
            accountId,
            create: {
              draft1: {
                mailboxIds: { [mailboxId]: true },
                from: [input.from],
                to: input.to,
                cc: input.cc ?? [],
                bcc: input.bcc ?? [],
                subject: input.subject,
                keywords: { $draft: true },
                bodyValues: {
                  t1: { value: input.text },
                  ...(input.html ? { h1: { value: input.html } } : {}),
                },
                textBody: [{ partId: "t1", type: "text/plain" }],
                ...(input.html
                  ? { htmlBody: [{ partId: "h1", type: "text/html" }] }
                  : {}),
                ...(input.inReplyTo?.length ? { inReplyTo: input.inReplyTo } : {}),
                ...(input.references?.length ? { references: input.references } : {}),
                ...(input.attachments?.length
                  ? {
                      attachments: input.attachments.map((file) => ({
                        ...file,
                        disposition: "attachment",
                      })),
                    }
                  : {}),
              },
            },
          },
          "c1",
        ],
      ],
    );
    const payload = this.first<{
      created?: Record<string, { id: string }>;
      notCreated?: Record<string, { description?: string }>;
    }>(response);
    const failed = payload.notCreated?.draft1;
    if (failed) {
      throw new Error(failed.description || "Unable to create the draft.");
    }
    return payload;
  }

  async submitEmail(
    accountId: string,
    identityId: string,
    emailId: string,
    mailboxes: { drafts: string; sent?: string },
  ) {
    const response = await this.request(
      [
        "urn:ietf:params:jmap:core",
        "urn:ietf:params:jmap:mail",
        "urn:ietf:params:jmap:submission",
      ],
      [
        [
          "EmailSubmission/set",
          {
            accountId,
            create: {
              send1: {
                emailId,
                identityId,
              },
            },
            onSuccessUpdateEmail: {
              "#send1": {
                [`mailboxIds/${mailboxes.drafts}`]: null,
                ...(mailboxes.sent ? { [`mailboxIds/${mailboxes.sent}`]: true } : {}),
                "keywords/$draft": null,
                "keywords/$seen": true,
              },
            },
          },
          "c1",
        ],
      ],
    );
    const payload = this.first<{
      created?: Record<string, { id: string }>;
      notCreated?: Record<string, { description?: string }>;
    }>(response);
    const failed = payload.notCreated?.send1;
    if (failed) {
      throw new Error(failed.description || "Unable to send. Check the address and try again.");
    }
    if (!payload.created?.send1) {
      throw new Error("Unable to send. Check the address and try again.");
    }
    return payload;
  }
}
