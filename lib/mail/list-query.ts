import type { Thread, ThreadDetail, ThreadListPage, ThreadListQuery } from "./types";

export const PAGE_SIZE = 20;
const PAGE_CAP = 50;

export function toListItem(thread: ThreadDetail): Thread {
  const { messages, ...rest } = thread;
  return {
    ...rest,
    hasAttachment:
      rest.hasAttachment ??
      messages.some((message) => message.attachments.some((file) => !file.inline)),
  };
}

export function pageThreads(
  threads: Thread[],
  query: ThreadListQuery = {},
): ThreadListPage {
  const unread = threads.filter((thread) => thread.unread).length;
  const filtered = filterThreads(threads, query);
  const sorted = sortThreads(filtered, query);
  const limit = clamp(query.limit ?? PAGE_SIZE, 1, PAGE_CAP);
  const offset = Math.max(0, query.offset ?? 0);
  return {
    threads: sorted.slice(offset, offset + limit),
    total: sorted.length,
    unread,
    hasMore: offset + limit < sorted.length,
  };
}

function filterThreads(threads: Thread[], query: ThreadListQuery) {
  const needle = query.q?.trim().toLowerCase();
  return threads.filter((thread) => {
    if (query.unread && !thread.unread) return false;
    if (query.hasAttachment && !thread.hasAttachment) return false;
    if (!needle) return true;
    return [thread.subject, thread.snippet, thread.from.name, thread.from.email]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

function sortThreads(threads: Thread[], query: ThreadListQuery) {
  const dir = query.order === "asc" ? 1 : -1;
  const key = query.sort ?? "date";
  return [...threads].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left < right) return -1 * dir;
    if (left > right) return 1 * dir;
    return b.date.localeCompare(a.date);
  });
}

function sortValue(thread: Thread, key: NonNullable<ThreadListQuery["sort"]>) {
  if (key === "from") return (thread.from.name || thread.from.email).toLowerCase();
  if (key === "subject") return thread.subject.toLowerCase();
  return thread.date;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
