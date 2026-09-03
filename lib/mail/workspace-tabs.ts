import {
  mailFolderHref,
  mailRouteFromPathname,
  type MailViewId,
} from "./routes.ts";

const MAX_PERSISTED_TABS = 30;
const TAB_URL_BASE = "http://localhost";

export type WorkspaceTab = {
  id: string;
  kind: "folder" | "thread" | "compose" | "settings";
  title: string;
  href: string;
  threadId?: string;
  unread?: boolean;
};

export type WorkspaceTabCloseAction =
  | "tab"
  | "others"
  | "all"
  | "right"
  | "read";

export type WorkspaceTabDropEdge = "before" | "after";

export function parseWorkspaceTabs(serialized: string | null): WorkspaceTab[] {
  if (!serialized) return [];

  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return uniqueValidTabs(value).slice(-MAX_PERSISTED_TABS);
  } catch {
    return [];
  }
}

export function serializeWorkspaceTabs(tabs: WorkspaceTab[]) {
  return JSON.stringify(uniqueValidTabs(tabs).slice(-MAX_PERSISTED_TABS));
}

export function mergeWorkspaceTabs(
  restored: WorkspaceTab[],
  current: WorkspaceTab[],
) {
  const merged = [...restored];
  for (const tab of current) {
    const index = merged.findIndex((item) => item.id === tab.id);
    if (index === -1) merged.push(tab);
    else merged[index] = tab;
  }
  return merged.slice(-MAX_PERSISTED_TABS);
}

export function ensureWorkspaceTab(
  tabs: WorkspaceTab[],
  fallback: WorkspaceTab | null,
) {
  if (!fallback || tabs.some((tab) => tab.id === fallback.id)) return tabs;
  return mergeWorkspaceTabs(tabs, [fallback]);
}

export function pinSettingsWorkspaceTab(tabs: WorkspaceTab[]) {
  const settingsIndex = tabs.findIndex((tab) => tab.kind === "settings");
  if (settingsIndex <= 0) return tabs;

  return [
    tabs[settingsIndex],
    ...tabs.slice(0, settingsIndex),
    ...tabs.slice(settingsIndex + 1),
  ];
}

export function isWorkspaceTabReorderable(tab: WorkspaceTab) {
  return tab.kind === "thread" || tab.kind === "compose";
}

export function reorderWorkspaceTabs(
  tabs: WorkspaceTab[],
  sourceId: string,
  targetId: string,
  edge: WorkspaceTabDropEdge,
) {
  if (sourceId === targetId) return tabs;
  const sourceIndex = tabs.findIndex((tab) => tab.id === sourceId);
  const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return tabs;
  if (
    !isWorkspaceTabReorderable(tabs[sourceIndex]) ||
    !isWorkspaceTabReorderable(tabs[targetIndex])
  ) {
    return tabs;
  }

  const next = [...tabs];
  const [source] = next.splice(sourceIndex, 1);
  const remainingTargetIndex = next.findIndex((tab) => tab.id === targetId);
  const insertionIndex =
    remainingTargetIndex + (edge === "after" ? 1 : 0);
  next.splice(insertionIndex, 0, source);
  return next.every((tab, index) => tab.id === tabs[index]?.id) ? tabs : next;
}

export function workspaceTabIdsToClose(
  tabs: WorkspaceTab[],
  targetId: string,
  action: WorkspaceTabCloseAction,
) {
  const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
  if (targetIndex === -1) return [];
  const closable = (tab: WorkspaceTab) => tab.kind !== "folder";

  if (action === "tab") {
    return closable(tabs[targetIndex]) ? [targetId] : [];
  }
  if (action === "others") {
    return tabs
      .filter((tab) => tab.id !== targetId && closable(tab))
      .map((tab) => tab.id);
  }
  if (action === "all") {
    return tabs.filter(closable).map((tab) => tab.id);
  }
  if (action === "right") {
    return tabs.slice(targetIndex + 1).filter(closable).map((tab) => tab.id);
  }
  return tabs
    .filter((tab) => tab.kind === "thread" && tab.unread !== true)
    .map((tab) => tab.id);
}

export function folderHrefFromWorkspaceTab(
  tab: WorkspaceTab | undefined,
  fallbackFolder: MailViewId,
  fallbackAccountId?: string | null,
) {
  if (!tab) return mailFolderHref(fallbackFolder, undefined, fallbackAccountId);
  const url = new URL(tab.href, TAB_URL_BASE);
  const route = mailRouteFromPathname(url.pathname);
  if (route?.kind !== "thread") {
    return mailFolderHref(fallbackFolder, undefined, fallbackAccountId);
  }
  return mailFolderHref(
    route.folder,
    url.searchParams,
    route.accountId ?? fallbackAccountId,
  );
}

function uniqueValidTabs(values: unknown[]) {
  const tabs: WorkspaceTab[] = [];
  for (const value of values) {
    const tab = validTab(value);
    if (!tab) continue;
    const existing = tabs.findIndex((item) => item.id === tab.id);
    if (existing === -1) tabs.push(tab);
    else tabs[existing] = tab;
  }
  return tabs;
}

function validTab(value: unknown): WorkspaceTab | null {
  if (!value || typeof value !== "object") return null;
  const tab = value as Record<string, unknown>;
  if (
    typeof tab.id !== "string" ||
    typeof tab.title !== "string" ||
    typeof tab.href !== "string" ||
    !tab.title.trim() ||
    tab.title.length > 200 ||
    !tab.href.startsWith("/mail/") ||
    tab.href.startsWith("//")
  ) {
    return null;
  }

  const url = new URL(tab.href, TAB_URL_BASE);
  if (url.origin !== TAB_URL_BASE || url.hash) return null;
  const route = mailRouteFromPathname(url.pathname);

  if (
    tab.kind === "thread" &&
    route?.kind === "thread" &&
    typeof tab.threadId === "string" &&
    tab.threadId === route.threadId &&
    tab.id === `thread:${route.accountId ?? "legacy"}:${route.threadId}`
  ) {
    const unread = typeof tab.unread === "boolean" ? tab.unread : undefined;
    return {
      id: tab.id,
      kind: "thread",
      title: tab.title,
      href: `${url.pathname}${url.search}`,
      threadId: tab.threadId,
      ...(unread === undefined ? {} : { unread }),
    };
  }

  if (tab.kind === "settings" && route?.kind === "settings" && tab.id === "settings") {
    return {
      id: "settings",
      kind: "settings",
      title: tab.title,
      href: `${url.pathname}${url.search}`,
    };
  }

  return null;
}
