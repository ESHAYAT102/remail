import "server-only";

import { googleApiRequest } from "@/lib/google/api";

export type GmailHeader = { name?: string; value?: string };

export type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
};

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
};

export type GmailThread = {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
};

export type GmailDraft = {
  id: string;
  message: GmailMessage;
};

export type GmailLabel = {
  id: string;
  name: string;
  type?: "system" | "user";
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

type GmailList<T> = {
  threads?: T[];
  drafts?: T[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailClient {
  constructor(private readonly accessToken: string) {}

  getProfile() {
    return this.request<{
      emailAddress: string;
      messagesTotal: number;
      threadsTotal: number;
      historyId: string;
    }>("/profile");
  }

  listThreads(input: {
    q?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
  }) {
    const params = new URLSearchParams();
    if (input.q) params.set("q", input.q);
    for (const labelId of input.labelIds ?? []) {
      params.append("labelIds", labelId);
    }
    if (input.maxResults) params.set("maxResults", String(input.maxResults));
    if (input.pageToken) params.set("pageToken", input.pageToken);
    return this.request<GmailList<{ id: string; threadId?: string }>>(
      `/threads?${params}`,
    );
  }

  getThread(
    id: string,
    format: "full" | "metadata" | "minimal" = "full",
  ) {
    const params = new URLSearchParams({ format });
    if (format === "metadata") {
      for (const header of ["From", "To", "Cc", "Bcc", "Subject", "Date"]) {
        params.append("metadataHeaders", header);
      }
    }
    return this.request<GmailThread>(
      `/threads/${encodeURIComponent(id)}?${params}`,
    );
  }

  getMessage(
    id: string,
    format: "full" | "metadata" | "minimal" = "metadata",
  ) {
    const params = new URLSearchParams({ format });
    for (const header of ["Message-ID", "References", "In-Reply-To"]) {
      params.append("metadataHeaders", header);
    }
    return this.request<GmailMessage>(
      `/messages/${encodeURIComponent(id)}?${params}`,
    );
  }

  listDrafts(input: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
  }) {
    const params = new URLSearchParams();
    if (input.q) params.set("q", input.q);
    if (input.maxResults) params.set("maxResults", String(input.maxResults));
    if (input.pageToken) params.set("pageToken", input.pageToken);
    return this.request<GmailList<{ id: string; message: { id: string; threadId: string } }>>(
      `/drafts?${params}`,
    );
  }

  getDraft(id: string, format: "full" | "metadata" = "full") {
    const params = new URLSearchParams({ format });
    if (format === "metadata") {
      for (const header of ["From", "To", "Cc", "Bcc", "Subject", "Date"]) {
        params.append("metadataHeaders", header);
      }
    }
    return this.request<GmailDraft>(
      `/drafts/${encodeURIComponent(id)}?${params}`,
    );
  }

  getLabel(id: string) {
    return this.request<GmailLabel>(`/labels/${encodeURIComponent(id)}`);
  }

  listLabels() {
    return this.request<{ labels?: GmailLabel[] }>("/labels");
  }

  createLabel(name: string) {
    return this.request<GmailLabel>("/labels", {
      method: "POST",
      body: JSON.stringify({
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    });
  }

  updateLabel(id: string, name: string) {
    return this.request<GmailLabel>(`/labels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  deleteLabel(id: string) {
    return this.request<void>(`/labels/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  getAttachment(messageId: string, attachmentId: string) {
    return this.request<{ size: number; data: string }>(
      `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
  }

  modifyThread(
    id: string,
    input: { addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    return this.request<GmailThread>(`/threads/${encodeURIComponent(id)}/modify`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  trashThread(id: string) {
    return this.request<GmailThread>(`/threads/${encodeURIComponent(id)}/trash`, {
      method: "POST",
    });
  }

  untrashThread(id: string) {
    return this.request<GmailThread>(
      `/threads/${encodeURIComponent(id)}/untrash`,
      { method: "POST" },
    );
  }

  sendRaw(raw: string, threadId?: string) {
    return this.request<GmailMessage>("/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw, threadId }),
    });
  }

  createDraft(raw: string, threadId?: string) {
    return this.request<GmailDraft>("/drafts", {
      method: "POST",
      body: JSON.stringify({ message: { raw, threadId } }),
    });
  }

  updateDraft(id: string, raw: string, threadId?: string) {
    return this.request<GmailDraft>(`/drafts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ message: { raw, threadId } }),
    });
  }

  sendDraft(id: string) {
    return this.request<GmailMessage>("/drafts/send", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  deleteDraft(id: string) {
    return this.request<void>(`/drafts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  listHistory(startHistoryId: string, pageToken?: string) {
    const params = new URLSearchParams({
      startHistoryId,
      maxResults: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    return this.request<{
      history?: Array<{ id: string }>;
      historyId?: string;
      nextPageToken?: string;
    }>(`/history?${params}`);
  }

  watch(topicName: string) {
    return this.request<{ historyId: string; expiration: string }>("/watch", {
      method: "POST",
      body: JSON.stringify({ topicName }),
    });
  }

  stopWatch() {
    return this.request<void>("/stop", { method: "POST" });
  }

  private request<T>(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    return googleApiRequest<T>(this.accessToken, `${GMAIL_API}${path}`, {
      ...init,
      headers,
    });
  }
}
