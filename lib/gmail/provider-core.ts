import type {
  MailFolderId,
  MailViewId,
  Thread,
  ThreadListQuery,
} from "../mail/types.ts";
import { isMailFolder } from "../mail/routes.ts";
import type { GmailMessagePart, GmailThread } from "./client.ts";
import { gmailMessageBodyAttachmentParts } from "./normalize.ts";

export const gmailFolderQueries: Record<Exclude<MailFolderId, "drafts">, string> = {
  inbox: "in:inbox",
  smart: "in:inbox is:unread",
  starred: "is:starred",
  sent: "in:sent",
  spam: "in:spam",
  trash: "in:trash",
  archived: "-in:inbox -in:sent -in:drafts -in:spam -in:trash",
};

export function gmailQuery(folder: MailViewId, query: ThreadListQuery) {
  const terms = [
    !isMailFolder(folder) || folder === "drafts"
      ? ""
      : gmailFolderQueries[folder],
  ];
  if (query.q?.trim()) terms.push(query.q.trim());
  if (query.unread && folder !== "smart") terms.push("is:unread");
  if (query.hasAttachment) terms.push("has:attachment");
  return terms.filter(Boolean).join(" ");
}

export function sortGmailThreads(threads: Thread[], query: ThreadListQuery) {
  const direction = query.order === "asc" ? 1 : -1;
  const field = query.sort ?? "date";
  return threads.sort((left, right) => {
    const leftValue =
      field === "from"
        ? left.from.name || left.from.email
        : field === "subject"
          ? left.subject
          : left.date;
    const rightValue =
      field === "from"
        ? right.from.name || right.from.email
        : field === "subject"
          ? right.subject
          : right.date;
    return leftValue.localeCompare(rightValue) * direction;
  });
}

type ReferencePage<T> = {
  references?: T[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

export async function listGmailReferences<T extends { id: string }>(
  take: number,
  loadPage: (input: {
    maxResults: number;
    pageToken?: string;
  }) => Promise<ReferencePage<T>>,
) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let estimate = 0;
  do {
    const page = await loadPage({
      maxResults: Math.min(100, Math.max(1, take - ids.length)),
      pageToken,
    });
    ids.push(...(page.references ?? []).map((reference) => reference.id));
    estimate = page.resultSizeEstimate ?? estimate;
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < take);
  return {
    ids,
    estimate: Math.max(estimate, ids.length),
    hasMore: Boolean(pageToken),
  };
}

export async function hydrateGmailThreadBodies(
  thread: GmailThread,
  getAttachment: (
    messageId: string,
    attachmentId: string,
  ) => Promise<{ data: string }>,
) {
  await Promise.all(
    (thread.messages ?? []).flatMap((message) =>
      gmailMessageBodyAttachmentParts(message).map(
        async (part: GmailMessagePart) => {
          const attachmentId = part.body?.attachmentId;
          if (!attachmentId) return;
          const payload = await getAttachment(message.id, attachmentId);
          part.body = { ...part.body, data: payload.data };
        },
      ),
    ),
  );
  return thread;
}
