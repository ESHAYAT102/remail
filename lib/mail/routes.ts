import type {
  MailCollection,
  MailCollectionViewId,
  MailFolderId,
  MailViewId,
  ThreadListQuery,
} from "./types";
import { threadQueryToSearch } from "./query-params.ts";

export const mailFolderIds = [
  "inbox",
  "smart",
  "starred",
  "sent",
  "drafts",
  "spam",
  "trash",
  "archived",
] as const satisfies readonly MailFolderId[];

export const mailSettingsSectionIds = [
  "account",
  "appearance",
  "security",
] as const;

export type MailSettingsSectionId = (typeof mailSettingsSectionIds)[number];

export const folderTitles: Record<MailFolderId, string> = {
  inbox: "Inbox",
  smart: "Unread",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  spam: "Spam",
  trash: "Trash",
  archived: "Archived",
};

export type { MailFolderId, MailViewId } from "./types";

export type MailPathRoute =
  | { kind: "folder"; accountId: string | null; folder: MailViewId }
  | {
      kind: "thread";
      accountId: string | null;
      folder: MailViewId;
      threadId: string;
    }
  | { kind: "settings"; section: MailSettingsSectionId };

export function isMailFolder(value: string): value is MailFolderId {
  return (mailFolderIds as readonly string[]).includes(value);
}

export function collectionViewId(id: string): MailCollectionViewId {
  return `collection:${id}`;
}

export function collectionIdFromView(view: string) {
  return view.startsWith("collection:") && view.length > "collection:".length
    ? view.slice("collection:".length)
    : null;
}

export function isMailView(value: string): value is MailViewId {
  return isMailFolder(value) || collectionIdFromView(value) !== null;
}

export function mailViewFromSegment(value: string): MailViewId | null {
  const decoded = decodeSegment(value);
  return isMailView(decoded) ? decoded : null;
}

export function isKnownMailView(
  view: MailViewId,
  collections: MailCollection[],
) {
  if (isMailFolder(view)) return true;
  const collectionId = collectionIdFromView(view);
  return collections.some((collection) => collection.id === collectionId);
}

export function folderTitle(
  folder: MailViewId,
  collections: MailCollection[] = [],
) {
  if (isMailFolder(folder)) return folderTitles[folder];
  const collectionId = collectionIdFromView(folder);
  return (
    collections.find((collection) => collection.id === collectionId)?.name ??
    "Mail"
  );
}

export function mailFolderHref(
  folder: MailViewId,
  query?: ThreadListQuery | URLSearchParams,
  accountId?: string | null,
) {
  return withQuery(
    accountId
      ? `/mail/a/${encodeURIComponent(accountId)}/${encodeURIComponent(folder)}`
      : `/mail/${encodeURIComponent(folder)}`,
    query,
  );
}

export function mailThreadHref(
  folder: MailViewId,
  threadId: string,
  query?: ThreadListQuery | URLSearchParams,
  accountId?: string | null,
) {
  return withQuery(
    accountId
      ? `/mail/a/${encodeURIComponent(accountId)}/${encodeURIComponent(folder)}/thread/${encodeURIComponent(threadId)}`
      : `/mail/${encodeURIComponent(folder)}/thread/${encodeURIComponent(threadId)}`,
    query,
  );
}

export function mailSettingsHref(section: MailSettingsSectionId) {
  return `/mail/settings/${section}`;
}

export const mailAccountsHref = mailSettingsHref("account");

export function mailRouteFromPathname(pathname: string): MailPathRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "mail") return null;

  if (segments[1] === "settings") {
    const rawSection = segments[2] ?? "account";
    const section = rawSection === "accounts" ? "account" : rawSection;
    if (
      segments.length <= 3 &&
      (mailSettingsSectionIds as readonly string[]).includes(section)
    ) {
      return { kind: "settings", section: section as MailSettingsSectionId };
    }
    return null;
  }

  if (segments[1] === "a" && segments[2] && segments[3]) {
    const accountId = decodeSegment(segments[2]);
    const folder = decodeSegment(segments[3]);
    if (!isMailView(folder)) return null;
    if (segments.length === 4) {
      return { kind: "folder", accountId, folder };
    }
    if (
      segments.length === 6 &&
      segments[4] === "thread" &&
      segments[5]
    ) {
      return {
        kind: "thread",
        accountId,
        folder,
        threadId: decodeSegment(segments[5]),
      };
    }
    return null;
  }

  const folder = decodeSegment(segments[1] ?? "");
  if (!folder || !isMailView(folder)) return null;
  if (segments.length === 2) {
    return { kind: "folder", accountId: null, folder };
  }

  if (segments.length === 4 && segments[2] === "thread" && segments[3]) {
    return {
      kind: "thread",
      accountId: null,
      folder,
      threadId: decodeSegment(segments[3]),
    };
  }

  return null;
}

function withQuery(
  pathname: string,
  query?: ThreadListQuery | URLSearchParams,
) {
  if (!query) return pathname;
  const params =
    query instanceof URLSearchParams ? query : threadQueryToSearch(query);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
