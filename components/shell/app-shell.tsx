"use client";

import Link from "next/link";
import { invalidateMailAccountCache } from "@/app/mail/cache-actions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { authClient } from "@/lib/auth-client";
import { AccountSessionsProvider } from "@/components/auth/account-sessions";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { SyncThemePreference } from "@/components/ui/theme-transitions";
import { ShortcutReferenceDialog } from "@/components/settings/shortcut-reference-dialog";
import { ThreadList } from "@/components/mail/thread-list";
import { ThreadView, type ReplyMode } from "@/components/mail/thread-view";
import { PendingSendRow } from "@/components/mail/pending-send";
import { removeDraft } from "@/lib/mail/draft-client";
import { ListToolbar } from "@/components/mail/list-toolbar";
import { ThreadToolbar } from "@/components/mail/thread-toolbar";
import { MailFolderLoading } from "@/components/mail/loading-state";
import { FolderMark } from "@/components/mail/folder-mark";
import { ThreadDragProvider } from "@/components/mail/thread-drag";
import type {
  ComposeInput,
  DomainSetup,
  MailAccount,
  MailCollection,
  MailViewId,
  Thread,
  ThreadDetail,
  ThreadListPage,
  ThreadListQuery,
} from "@/lib/mail/types";
import { PAGE_SIZE } from "@/lib/mail/list-query";
import {
  emptyComposeInput,
} from "@/lib/mail/composer-footer";
import {
  persistThreadArchive,
  persistThreadMove,
  persistThreadCollection,
  persistThreadStarred,
  persistThreadUnread,
} from "@/lib/mail/thread-state";
import type { FolderCounts } from "@/lib/mail/folder-counts";
import { defaultSenderEmail, ownAddressList } from "@/lib/mail/identity";
import {
  enabledKeybindMatchesEvent,
  keybindMatchesEvent,
} from "@/lib/mail/keybinds";
import {
  collectThreadSelectionTargets,
  type ThreadBulkAction,
  type ThreadBulkActionRequest,
  type ThreadBulkActionResult,
  type ThreadSelectionTargets,
} from "@/lib/mail/thread-selection";
import type { ThreadDropTarget } from "@/lib/mail/thread-drag";
import { threadQueryToSearch } from "@/lib/mail/query-params";
import {
  folderTitle,
  collectionViewId,
  collectionIdFromView,
  mailFolderHref,
  mailRouteFromPathname,
  mailSettingsHref,
  mailThreadHref,
  isMailFolder,
  mailFolderIds,
} from "@/lib/mail/routes";
import {
  ensureWorkspaceTab,
  mergeWorkspaceTabs,
  parseWorkspaceTabs,
  pinSettingsWorkspaceTab,
  reorderWorkspaceTabs,
  serializeWorkspaceTabs,
  type WorkspaceTab,
  type WorkspaceTabDropEdge,
} from "@/lib/mail/workspace-tabs";
import type { SessionUser } from "@/lib/session";
import type { UserPreferences } from "@/lib/preferences";
import { userPreferencesStore } from "@/lib/user-preferences-store";
import { usePendingSend, type PendingSend } from "@/lib/mail/use-pending-send";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { MobileNav } from "./mobile-nav";
import { PaneHeader } from "./pane-header";
import { mailFoldersForAccount, Sidebar } from "./sidebar";
import { StandaloneComposer } from "./standalone-composer";
import {
  WorkspaceTabs,
  type WorkspaceTabEdge,
} from "./workspace-tabs";

const FOLDER_TAB_ID = "folder";
const SETTINGS_TAB_ID = "settings";
const EMPTY_THREAD_SELECTION: ReadonlySet<string> = new Set();

const styles = stylex.create({
  shell: {
    display: "flex",
    height: "100vh",
    backgroundColor: colors.shell,
    overflow: "hidden",
    paddingInline: space[2],
    paddingBottom: space[2],
    gap: space[1],
    "@media (max-width: 640px)": {
      paddingInline: 0,
      paddingBottom: 0,
    },
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  pane: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 0,
    boxShadow: elevation.panel,
    overflow: "hidden",
    "@media (max-width: 640px)": {
      borderRadius: 0,
      boxShadow: "none",
    },
  },
  paneFlushStart: {
    "@media (min-width: 641px)": {
      borderStartStartRadius: 0,
    },
  },
  reader: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    paddingInline: space[4],
    paddingBlock: space[4],
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  readerList: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space[1],
    color: colors.textFaint,
    fontSize: fonts.uiSize,
    textAlign: "center",
    padding: space[6],
  },
  emptyTitle: {
    fontWeight: 500,
    color: colors.textMuted,
  },
  emptyHint: {
    fontSize: fonts.captionSize,
    color: colors.textFaint,
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    marginTop: space[3],
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    borderRadius: radius.lg,
    color: colors.surface,
    backgroundColor: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    textDecoration: "none",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { opacity: 0.88 },
    },
  },
});

type MailShellContextValue = {
  account: MailAccount;
  sessionUser: SessionUser;
  userEmail: string;
  /** Every address that counts as "me": mailbox, login identity, domain mailbox. */
  ownEmails: string[];
  userName: string;
  demoMode: boolean;
  preferences: UserPreferences;
  collections: MailCollection[];
  updatePreferences: (preferences: UserPreferences) => void;
  updateUser: (user: SessionUser) => void;
  domain: DomainSetup | null;
  setDomain: (domain: DomainSetup | null) => void;
  pending: PendingSend[];
  recalled: PendingSend | null;
  clearRecalled: () => void;
  sending: boolean;
  compose: () => void;
  openDraft: (draft: ComposeInput) => void;
  threadComposeIntent: { threadId: string; mode: "reply" | "forward" } | null;
  openThreadComposer: (threadId: string, mode: "reply" | "forward") => void;
  clearThreadComposeIntent: () => void;
  registerView: (tab: WorkspaceTab) => void;
  updateThreadViewUnread: (threadId: string, unread: boolean) => void;
  adjustUnreadCounts: (folder: string, delta: number) => void;
  adjustArchiveCounts: (folder: string, unread: boolean, direction: 1 | -1) => void;
  adjustMoveCounts: (
    folder: string,
    destination: "inbox" | "spam" | "trash",
    unread: boolean,
    direction: 1 | -1,
  ) => void;
  adjustStarredCounts: (starred: boolean, direction: 1 | -1) => void;
  recallSend: (id: string) => void;
  sendPendingNow: (id: string) => void;
  settlePendingSend: (id: string) => void;
  sendCompose: (input: ComposeInput, files?: File[]) => Promise<string | null>;
  rememberFolderPage: (
    folder: MailViewId,
    queryString: string,
    page: ThreadListPage,
  ) => void;
  getFolderPage: (
    folder: MailViewId,
    queryString: string,
  ) => ThreadListPage | null;
};

const MailShellContext = createContext<MailShellContextValue | null>(null);
const WORKSPACE_TABS_CHANGE_EVENT = "redakt:workspace-tabs-change";
const EMPTY_WORKSPACE_TABS = "[]";
const EMPTY_THREADS: Thread[] = [];
const workspaceTabsFallback = new Map<string, string>();

type WorkspaceTabsChangeDetail = {
  key: string;
  serialized: string;
};

function persistWorkspaceTabs(key: string, tabs: WorkspaceTab[]) {
  const serialized = serializeWorkspaceTabs(tabs);
  workspaceTabsFallback.set(key, serialized);
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // Keep navigation usable even when storage is full or unavailable.
  }
  window.dispatchEvent(
    new CustomEvent<WorkspaceTabsChangeDetail>(WORKSPACE_TABS_CHANGE_EVENT, {
      detail: { key, serialized },
    }),
  );
}

function workspaceTabsSnapshot(key: string) {
  if (typeof window === "undefined") return EMPTY_WORKSPACE_TABS;
  try {
    const serialized = window.localStorage.getItem(key);
    if (serialized !== null) {
      workspaceTabsFallback.set(key, serialized);
      return serialized;
    }
  } catch {
    // Fall back to this page's last in-memory snapshot.
  }
  return workspaceTabsFallback.get(key) ?? EMPTY_WORKSPACE_TABS;
}

function subscribeWorkspaceTabs(key: string, listener: () => void) {
  const syncTabs = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceTabsChangeDetail>).detail;
    if (detail?.key === key) listener();
  };
  const syncStorage = (event: StorageEvent) => {
    if (event.key === key) listener();
  };
  window.addEventListener(WORKSPACE_TABS_CHANGE_EVENT, syncTabs);
  window.addEventListener("storage", syncStorage);
  return () => {
    window.removeEventListener(WORKSPACE_TABS_CHANGE_EVENT, syncTabs);
    window.removeEventListener("storage", syncStorage);
  };
}

function useWorkspaceTabs(key: string) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeWorkspaceTabs(key, listener),
    [key],
  );
  const getSnapshot = useCallback(() => workspaceTabsSnapshot(key), [key]);
  const serialized = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_WORKSPACE_TABS,
  );
  const tabs = useMemo(
    () => pinSettingsWorkspaceTab(parseWorkspaceTabs(serialized)),
    [serialized],
  );
  const setTabs = useCallback(
    (
      update:
        | WorkspaceTab[]
        | ((current: WorkspaceTab[]) => WorkspaceTab[]),
    ) => {
      const current = pinSettingsWorkspaceTab(
        parseWorkspaceTabs(workspaceTabsSnapshot(key)),
      );
      const next = typeof update === "function" ? update(current) : update;
      if (serializeWorkspaceTabs(current) === serializeWorkspaceTabs(next)) return;
      persistWorkspaceTabs(key, next);
    },
    [key],
  );
  return [tabs, setTabs] as const;
}

function AppShellProviders({
  accountUser,
  demoMode,
  mail,
  children,
}: {
  accountUser: SessionUser;
  demoMode: boolean;
  mail: MailShellContextValue;
  children: React.ReactNode;
}) {
  return (
    <AccountSessionsProvider currentUser={accountUser} demoMode={demoMode}>
      <MailShellContext.Provider value={mail}>
        <ThreadDragProvider>{children}</ThreadDragProvider>
      </MailShellContext.Provider>
    </AccountSessionsProvider>
  );
}

export function useMailShell() {
  const context = useContext(MailShellContext);
  if (!context) throw new Error("Mail routes must render inside AppShell");
  return context;
}

function composeFields(input: ComposeInput) {
  const form = new FormData();
  if (input.from) form.set("from", input.from);
  form.set("to", input.to);
  form.set("cc", input.cc ?? "");
  form.set("bcc", input.bcc ?? "");
  form.set("subject", input.subject);
  form.set("text", input.text);
  if (input.html) form.set("html", input.html);
  if (input.inReplyTo) form.set("inReplyTo", input.inReplyTo);
  if (input.threadId) form.set("threadId", input.threadId);
  if (input.draftId) form.set("draftId", input.draftId);
  return form;
}

function composeBody(input: ComposeInput, files: File[], accountId: string) {
  const form = composeFields(input);
  if (files.length === 0) return form;
  return uploadComposeAttachments(files, accountId).then((uploadIds) => {
    form.set("attachmentUploadIds", uploadIds.join(","));
    return form;
  });
}

async function uploadComposeAttachments(files: File[], accountId: string) {
  const chunkSize = 1024 * 1024;
  const uploadIds: string[] = [];
  for (const file of files) {
    const uploadId = crypto.randomUUID();
    uploadIds.push(uploadId);
    for (let offset = 0, chunk = 0; offset < file.size || (file.size === 0 && chunk === 0); offset += chunkSize, chunk += 1) {
      const response = await fetch(
        `/api/mail/attachment-uploads?account=${encodeURIComponent(accountId)}&upload=${uploadId}&chunk=${chunk}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-File-Type": file.type || "application/octet-stream",
            "X-File-Size": String(file.size),
          },
          body: file.slice(offset, Math.min(file.size, offset + chunkSize)),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Unable to upload ${file.name}.`);
      }
      if (file.size === 0) break;
    }
  }
  return uploadIds;
}

function threadTabId(accountId: string, threadId: string) {
  return `thread:${accountId}:${threadId}`;
}

function folderPageCacheKey(folder: MailViewId, queryString: string) {
  return `${folder}:${queryString}`;
}

export function AppShell({
  user,
  account,
  initialDomain,
  folderCounts,
  collections,
  initialPreferences,
  demoMode,
  children,
}: {
  user: SessionUser;
  account: MailAccount;
  initialDomain: DomainSetup | null;
  folderCounts: FolderCounts;
  collections: MailCollection[];
  initialPreferences: UserPreferences;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => mailRouteFromPathname(pathname), [pathname]);
  const routeFolder =
    route?.kind === "folder" || route?.kind === "thread" ? route.folder : null;
  const tabStorageKey = `redakt:workspace-tabs:v2:${encodeURIComponent(user.id)}:${encodeURIComponent(account.id)}`;
  const [tabs, setTabs] = useWorkspaceTabs(tabStorageKey);
  const [activeUser, setActiveUser] = useState(user);
  const subscribePreferences = useCallback(
    (listener: () => void) =>
      userPreferencesStore.subscribe(user.id, listener),
    [user.id],
  );
  const getPreferencesSnapshot = useCallback(
    () => userPreferencesStore.getSnapshot(user.id, initialPreferences),
    [initialPreferences, user.id],
  );
  const preferences = useSyncExternalStore(
    subscribePreferences,
    getPreferencesSnapshot,
    () => initialPreferences,
  );
  const setPreferences = useCallback(
    (next: UserPreferences) => userPreferencesStore.set(user.id, next),
    [user.id],
  );
  const [activeTabEdge, setActiveTabEdge] = useState<WorkspaceTabEdge>(null);
  const [domain, setDomain] = useState<DomainSetup | null>(initialDomain);
  const [composeOpen, setComposeOpen] = useState(false);
  const [threadComposeIntent, setThreadComposeIntent] = useState<{
    threadId: string;
    mode: "reply" | "forward";
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState<ComposeInput | null>(null);
  const [composerSession, setComposerSession] = useState(0);
  const [recalled, setRecalled] = useState<PendingSend | null>(null);
  const [folderCountState, setFolderCountState] = useState<{
    source: FolderCounts;
    deltas: Partial<FolderCounts>;
  }>(() => ({ source: folderCounts, deltas: {} }));
  if (folderCountState.source !== folderCounts) {
    // A server refresh now includes the optimistic changes. Drop their local
    // deltas so those changes are not counted a second time.
    setFolderCountState({ source: folderCounts, deltas: {} });
  }
  const folderPages = useRef(new Map<string, ThreadListPage>());
  const previousPath = useRef(pathname);

  const rememberFolderPage = useCallback(
    (folder: MailViewId, queryString: string, page: ThreadListPage) => {
      folderPages.current.set(folderPageCacheKey(folder, queryString), page);
    },
    [],
  );
  const getFolderPage = useCallback(
    (folder: MailViewId, queryString: string) =>
      folderPages.current.get(folderPageCacheKey(folder, queryString)) ?? null,
    [],
  );

  const folder = routeFolder ?? "inbox";

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);
  const activeCollection = collections.find(
    (collection) => collection.id === collectionIdFromView(folder),
  );
  const folderTab = useMemo<WorkspaceTab>(
    () => ({
      id: FOLDER_TAB_ID,
      kind: "folder",
      title: folderTitle(folder, collections),
      href: mailFolderHref(folder, undefined, account.id),
    }),
    [account.id, collections, folder],
  );

  const fallbackRouteTab = useMemo<WorkspaceTab | null>(() => {
    if (route?.kind === "thread") {
      return {
        id: threadTabId(account.id, route.threadId),
        kind: "thread",
        title: "Conversation",
        threadId: route.threadId,
        href: pathname,
      };
    }
    if (route?.kind === "settings") {
      return {
        id: SETTINGS_TAB_ID,
        kind: "settings",
        title: "Settings",
        href: pathname,
      };
    }
    return null;
  }, [account.id, pathname, route]);

  const visibleTabs = useMemo(() => {
    const routeTabs = pinSettingsWorkspaceTab(
      ensureWorkspaceTab(tabs, fallbackRouteTab),
    );
    return [folderTab, ...routeTabs];
  }, [fallbackRouteTab, folderTab, tabs]);

  const activeId =
    route?.kind === "thread"
      ? threadTabId(account.id, route.threadId)
      : route?.kind === "settings"
        ? SETTINGS_TAB_ID
        : FOLDER_TAB_ID;

  const visibleFolderCounts = useMemo(
    () =>
      Object.fromEntries(
        mailFolderIds.map((id) => [
          id,
          Math.max(0, folderCounts[id] + (folderCountState.deltas[id] ?? 0)),
        ]),
      ) as FolderCounts,
    [folderCountState.deltas, folderCounts],
  );

  const ownEmails = useMemo(
    () => ownAddressList(account.email, activeUser.email, domain?.mailbox),
    [account.email, activeUser.email, domain?.mailbox],
  );

  const adjustUnreadCounts = useCallback((_folder: string, delta: number) => {
    setFolderCountState((current) => ({
      ...current,
      deltas: {
        ...current.deltas,
        smart: (current.deltas.smart ?? 0) + delta,
      },
    }));
  }, []);

  const adjustArchiveCounts = useCallback(
    (folder: string, unread: boolean, direction: 1 | -1) => {
      const source = folder === "smart" ? "inbox" : isMailFolder(folder) ? folder : null;
      if (!source || source === "archived") return;
      // Badges show unread threads, so read threads move silently.
      if (!unread) return;
      setFolderCountState((current) => ({
        ...current,
        deltas: {
          ...current.deltas,
          [source]: (current.deltas[source] ?? 0) - direction,
          archived: (current.deltas.archived ?? 0) + direction,
          smart:
            (current.deltas.smart ?? 0) +
            (source === "inbox" ? -direction : 0),
        },
      }));
    },
    [],
  );

  const adjustMoveCounts = useCallback(
    (
      folder: string,
      destination: "inbox" | "spam" | "trash",
      unread: boolean,
      direction: 1 | -1,
    ) => {
      const source = folder === "smart" ? "inbox" : isMailFolder(folder) ? folder : null;
      if (!source || source === destination) return;
      // Badges show unread threads, so read threads move silently.
      if (!unread) return;
      setFolderCountState((current) => ({
        ...current,
        deltas: {
          ...current.deltas,
          [source]: (current.deltas[source] ?? 0) - direction,
          [destination]: (current.deltas[destination] ?? 0) + direction,
          smart:
            (current.deltas.smart ?? 0) +
            (source === "inbox" ? -direction : 0) +
            (destination === "inbox" ? direction : 0),
        },
      }));
    },
    [],
  );

  const adjustStarredCounts = useCallback(
    (starred: boolean, direction: 1 | -1) => {
      setFolderCountState((current) => ({
        ...current,
        deltas: {
          ...current.deltas,
          starred:
            (current.deltas.starred ?? 0) +
            (starred ? direction : -direction),
        },
      }));
    },
    [],
  );

  const registerView = useCallback((tab: WorkspaceTab) => {
    if (tab.kind === "folder") return;
    setTabs((current) => {
      const index = current.findIndex((item) => item.id === tab.id);
      if (index === -1) {
        return pinSettingsWorkspaceTab(mergeWorkspaceTabs(current, [tab]));
      }
      const existing = current[index];
      if (
        existing.title === tab.title &&
        existing.href === tab.href &&
        existing.kind === tab.kind &&
        existing.unread === tab.unread
      ) {
        return current;
      }
      return current.map((item) => (item.id === tab.id ? tab : item));
    });
  }, [setTabs]);

  const updateThreadViewUnread = useCallback(
    (threadId: string, unread: boolean) => {
      setTabs((current) => {
        let changed = false;
        const next = current.map((tab) => {
          if (
            tab.kind !== "thread" ||
            tab.threadId !== threadId ||
            tab.unread === unread
          ) {
            return tab;
          }
          changed = true;
          return { ...tab, unread };
        });
        return changed ? next : current;
      });
    },
    [setTabs],
  );

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    let focusFrame = 0;
    const routeFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("#main h1")
          ?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(routeFrame);
      cancelAnimationFrame(focusFrame);
    };
  }, [pathname]);

  const {
    pending,
    queue: queueSend,
    undo: undoSend,
    sendNow: sendPendingNow,
    settle: settlePendingSend,
  } = usePendingSend({
    endpoint: `/api/mail/send?account=${encodeURIComponent(account.id)}`,
    buildBody: (input, files) => composeBody(input, files, account.id),
    onDelivered: async (item) => {
      if (item.input.inReplyTo) {
        router.refresh();
        return;
      }
      if (pathname === mailFolderHref("sent", undefined, account.id)) {
        router.refresh();
      } else {
        router.push(mailFolderHref("sent", undefined, account.id));
        router.refresh();
      }
    },
  });

  const compose = useCallback(() => {
    setComposerDraft(null);
    setComposerSession((current) => current + 1);
    setComposeOpen(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const previousTheme = preferences.theme;
    const dark =
      previousTheme === "dark" ||
      (previousTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const theme = dark ? "light" : "dark";
    setPreferences({ ...preferences, theme });
    void fetch("/api/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).then((response) => {
      if (response.ok) return;
      setPreferences(preferences);
    }).catch(() => {
      setPreferences(preferences);
    });
  }, [preferences, setPreferences]);

  const openDraft = useCallback((draft: ComposeInput) => {
    setComposerDraft(draft);
    setComposerSession((current) => current + 1);
    setComposeOpen(true);
  }, []);

  const openThreadComposer = useCallback(
    (threadId: string, mode: "reply" | "forward") => {
      setThreadComposeIntent({ threadId, mode });
    },
    [],
  );
  const clearThreadComposeIntent = useCallback(
    () => setThreadComposeIntent(null),
    [],
  );

  const signOut = useCallback(async () => {
    if (demoMode) await fetch("/api/auth/demo", { method: "DELETE" });
    else await authClient.signOut();
    router.replace("/");
    router.refresh();
  }, [demoMode, router]);

  const sendCompose = useCallback(
    async (input: ComposeInput, files: File[] = []) => {
      if (!input.to.trim()) return "Add a recipient.";
      setRecalled(null);
      queueSend(input, files);
      setComposeOpen(false);
      return null;
    },
    [queueSend],
  );

  const recallSend = useCallback(
    (id: string) => {
      const item = undoSend(id);
      if (!item) return;
      setRecalled(item);
      if (!item.input.inReplyTo) {
        setComposerDraft(item.input);
        setComposerSession((current) => current + 1);
        setComposeOpen(true);
      }
    },
    [undoSend],
  );

  const clearRecalled = useCallback(() => setRecalled(null), []);

  const closeTabs = useCallback(
    (ids: string[]) => {
      const closing = new Set(ids.filter((id) => id !== FOLDER_TAB_ID));
      if (closing.size === 0) return;

      const activeIndex = visibleTabs.findIndex((tab) => tab.id === activeId);
      const nextTab = visibleTabs
        .slice(activeIndex + 1)
        .find((tab) => !closing.has(tab.id));
      const previousTab = visibleTabs
        .slice(0, Math.max(0, activeIndex))
        .toReversed()
        .find((tab) => !closing.has(tab.id));

      setTabs((current) => current.filter((tab) => !closing.has(tab.id)));
      if (closing.has(activeId)) {
        router.push((nextTab ?? previousTab ?? folderTab).href);
      }
    },
    [activeId, folderTab, router, setTabs, visibleTabs],
  );

  const reorderTabs = useCallback(
    (sourceId: string, targetId: string, edge: WorkspaceTabDropEdge) => {
      setTabs((current) =>
        pinSettingsWorkspaceTab(
          reorderWorkspaceTabs(current, sourceId, targetId, edge),
        ),
      );
    },
    [setTabs],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keybinds = preferences.keybinds;
      if (keybindMatchesEvent(event, keybinds.openSettings)) {
        event.preventDefault();
        router.push(mailSettingsHref("account"));
        return;
      }
      if (
        keybindMatchesEvent(event, keybinds.showShortcuts) &&
        !isTyping(event)
      ) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
        return;
      }
      if (
        preferences.singleKeyShortcuts &&
        !isTyping(event) &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        /^(Digit|Numpad)[1-9]$/.test(event.code)
      ) {
        const index = Number(event.code.slice(-1)) - 1;
        const destination = mailFoldersForAccount(account)[index];
        if (destination) {
          event.preventDefault();
          router.push(mailFolderHref(destination.id, undefined, account.id));
        }
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.closeTab,
          preferences.singleKeyShortcuts,
        ) &&
        !isTyping(event) &&
        activeId !== FOLDER_TAB_ID
      ) {
        event.preventDefault();
        closeTabs([activeId]);
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.newEmail,
          preferences.singleKeyShortcuts,
        ) &&
        !isTyping(event)
      ) {
        event.preventDefault();
        compose();
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.newFolder,
          preferences.singleKeyShortcuts,
        ) &&
        !isTyping(event)
      ) {
        event.preventDefault();
        window.dispatchEvent(new Event("redakt:create-folder"));
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.toggleTheme,
          preferences.singleKeyShortcuts,
        ) &&
        !isTyping(event)
      ) {
        event.preventDefault();
        toggleTheme();
        return;
      }
      if (
        (enabledKeybindMatchesEvent(
          event,
          keybinds.prevTab,
          preferences.singleKeyShortcuts,
        ) ||
          enabledKeybindMatchesEvent(
            event,
            keybinds.nextTab,
            preferences.singleKeyShortcuts,
          )) &&
        !isTyping(event)
      ) {
        const idx = visibleTabs.findIndex((tab) => tab.id === activeId);
        const target = keybindMatchesEvent(event, keybinds.prevTab)
          ? visibleTabs[idx - 1]
          : visibleTabs[idx + 1];
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    account,
    activeId,
    closeTabs,
    compose,
    preferences.keybinds,
    preferences.singleKeyShortcuts,
    router,
    toggleTheme,
    visibleTabs,
  ]);

  const context = useMemo<MailShellContextValue>(
    () => ({
      account,
      sessionUser: activeUser,
      userEmail: account.email,
      ownEmails,
      userName:
        activeUser.name,
      demoMode,
      preferences,
      collections,
      updatePreferences: setPreferences,
      updateUser: setActiveUser,
      domain,
      setDomain,
      pending,
      recalled,
      clearRecalled,
      sending: false,
      compose,
      openDraft,
      threadComposeIntent,
      openThreadComposer,
      clearThreadComposeIntent,
      registerView,
      updateThreadViewUnread,
      adjustUnreadCounts,
      adjustArchiveCounts,
      adjustMoveCounts,
      adjustStarredCounts,
      recallSend,
      sendPendingNow,
      settlePendingSend,
      sendCompose,
      rememberFolderPage,
      getFolderPage,
    }),
    [
      activeUser,
      adjustUnreadCounts,
      adjustArchiveCounts,
      adjustMoveCounts,
      adjustStarredCounts,
      clearRecalled,
      clearThreadComposeIntent,
      compose,
      demoMode,
      openDraft,
      openThreadComposer,
      domain,
      pending,
      preferences,
      threadComposeIntent,
      collections,
      recalled,
      recallSend,
      registerView,
      setPreferences,
      updateThreadViewUnread,
      sendPendingNow,
      settlePendingSend,
      sendCompose,
      rememberFolderPage,
      getFolderPage,
      account,
      ownEmails,
    ],
  );

  return (
    <AppShellProviders
      accountUser={activeUser}
      demoMode={demoMode}
      mail={context}
    >
      <SyncThemePreference preference={preferences.theme} />
      <ShortcutReferenceDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        keybinds={preferences.keybinds}
      />
      <div
        data-mail-shell=""
        data-density={preferences.density}
        {...stylex.props(styles.shell)}
      >
        <Sidebar
          account={account}
          folder={folder}
          folderCounts={visibleFolderCounts}
          collections={collections}
          onCompose={compose}
          onSignOut={signOut}
        />
        <main id="main" {...stylex.props(styles.main)}>
          <WorkspaceTabs
            tabs={visibleTabs}
            activeId={activeId}
            folderIcon={
              activeCollection?.kind === "label" ? (
                <Icons.tag size={13} />
              ) : activeCollection ? (
                <FolderMark
                  seed={activeCollection.id}
                  color={activeCollection.color}
                  icon={activeCollection.icon}
                  size="compact"
                />
              ) : undefined
            }
            leading={
              <MobileNav
                account={account}
                folder={folder}
                folderCounts={visibleFolderCounts}
                collections={collections}
                onCompose={compose}
                onSignOut={signOut}
              />
            }
            onClose={closeTabs}
            onReorder={reorderTabs}
            onCompose={compose}
            onActiveEdgeChange={setActiveTabEdge}
          />
          <div
            suppressHydrationWarning
            {...stylex.props(
              styles.pane,
              (visibleTabs[0]?.id === activeId ||
                activeTabEdge === "start" ||
                activeTabEdge === "both") &&
                styles.paneFlushStart,
            )}
          >
            {children}
          </div>
        </main>
        <StandaloneComposer
          key={`${composerSession}:${composerDraft?.draftId ?? recalled?.id ?? "new"}:${preferences.includeRedaktFooter}`}
          accountId={account.id}
          senderEmail={defaultSenderEmail(
            account.email,
            preferences.defaultSenderAlias,
            activeUser.email,
          )}
          editableSender
          supportsDrafts={account.capabilities.includes("drafts")}
          open={composeOpen}
          sending={false}
          initial={
            composerDraft ??
            recalled?.input ??
            emptyComposeInput(preferences.includeRedaktFooter)
          }
          recalled={recalled?.input ?? null}
          onOpenChange={(next) => {
            if (!next) {
              setRecalled(null);
              setComposerDraft(null);
            }
            setComposeOpen(next);
          }}
          onSend={sendCompose}
        />
      </div>
    </AppShellProviders>
  );
}

export function FolderRoute({
  folder,
  title,
  initialPage,
  query,
}: {
  folder: MailViewId;
  title: string;
  initialPage: ThreadListPage;
  query: ThreadListQuery;
}) {
  const router = useRouter();
  const { account, collections, rememberFolderPage } = useMailShell();
  const queryString = threadQueryToSearch({
    ...query,
    limit: undefined,
    offset: 0,
  }).toString();

  useEffect(() => {
    rememberFolderPage(folder, queryString, initialPage);
  }, [folder, initialPage, queryString, rememberFolderPage]);
  const collection = collections.find(
    (item) => item.id === collectionIdFromView(folder),
  );
  const querySearch = query.q ?? "";
  const [searchState, setSearchState] = useState({
    query: querySearch,
    value: querySearch,
  });
  const selectionScope = `${account.id}:${folder}:${threadQueryToSearch(query)}`;
  const [selection, setSelection] = useState<{
    scope: string;
    ids: Set<string>;
  }>(() => ({ scope: selectionScope, ids: new Set() }));
  const initialSelectionTargets = useMemo(
    () => collectThreadSelectionTargets(initialPage.threads),
    [initialPage.threads],
  );
  const [selectionTargetState, setSelectionTargetState] = useState<{
    scope: string;
    targets: ThreadSelectionTargets;
  }>(() => ({ scope: selectionScope, targets: initialSelectionTargets }));
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const bulkActionSequence = useRef(0);
  const [bulkActionState, setBulkActionState] = useState<{
    scope: string;
    request: ThreadBulkActionRequest | null;
    status: string;
  }>(() => ({ scope: selectionScope, request: null, status: "" }));
  const selectedThreadIds =
    selection.scope === selectionScope
      ? selection.ids
      : EMPTY_THREAD_SELECTION;
  const selectionTargets =
    selectionTargetState.scope === selectionScope
      ? selectionTargetState.targets
      : initialSelectionTargets;
  const bulkActionRequest =
    bulkActionState.scope === selectionScope
      ? bulkActionState.request
      : null;
  const bulkActionStatus =
    bulkActionState.scope === selectionScope ? bulkActionState.status : "";
  const updateSelection = useCallback(
    (ids: Set<string>) => setSelection({ scope: selectionScope, ids }),
    [selectionScope],
  );
  const replaceSelection = useCallback(
    (ids: Set<string>) => {
      setSelection({ scope: selectionScope, ids });
      setSelectionResetKey((current) => current + 1);
    },
    [selectionScope],
  );
  const updateSelectionTargets = useCallback(
    (targets: ThreadSelectionTargets) => {
      setSelectionTargetState({ scope: selectionScope, targets });
      setSelection((current) => {
        if (current.scope !== selectionScope) return current;
        const visibleIds = new Set(targets.allIds);
        const ids = new Set(
          [...current.ids].filter((id) => visibleIds.has(id)),
        );
        return ids.size === current.ids.size
          ? current
          : { scope: selectionScope, ids };
      });
    },
    [selectionScope],
  );
  const requestActionForThreads = useCallback(
    (threadIds: string[], action: ThreadBulkAction) => {
      if (threadIds.length === 0 || bulkActionRequest) return;
      bulkActionSequence.current += 1;
      setBulkActionState({
        scope: selectionScope,
        request: {
          id: bulkActionSequence.current,
          threadIds,
          action,
        },
        status: "",
      });
    },
    [bulkActionRequest, selectionScope],
  );
  const requestBulkAction = useCallback(
    (action: ThreadBulkAction) => {
      requestActionForThreads([...selectedThreadIds], action);
    },
    [requestActionForThreads, selectedThreadIds],
  );
  const toggleSelectedUnread = useCallback(() => {
    if (!account.capabilities.includes("markUnread")) return;
    const selectedThreads = selectionTargets.items.filter((thread) =>
      selectedThreadIds.has(thread.id),
    );
    if (selectedThreads.length === 0) return;
    requestBulkAction({
      type: "unread",
      unread: !selectedThreads.some((thread) => thread.unread),
    });
  }, [account.capabilities, requestBulkAction, selectedThreadIds, selectionTargets]);
  const toggleActiveUnread = useCallback(
    (threadId: string) => {
      if (!account.capabilities.includes("markUnread")) return;
      const thread = selectionTargets.items.find((item) => item.id === threadId);
      if (!thread) return;
      requestActionForThreads([threadId], {
        type: "unread",
        unread: !thread.unread,
      });
    },
    [account.capabilities, requestActionForThreads, selectionTargets.items],
  );
  const completeBulkAction = useCallback(
    (id: number, result: ThreadBulkActionResult) => {
      setBulkActionState((current) => {
        if (
          current.scope !== selectionScope ||
          current.request?.id !== id
        ) {
          return current;
        }
        const succeeded = result.total - result.failed;
        const conversationLabel =
          result.total === 1 ? "conversation" : "conversations";
        const status =
          result.failed === 0
            ? `Updated ${result.total} ${conversationLabel}`
            : succeeded === 0
              ? `Unable to update ${result.total} ${conversationLabel}`
              : `Updated ${succeeded} of ${result.total} conversations`;
        return { ...current, request: null, status };
      });
      router.refresh();
    },
    [router, selectionScope],
  );
  const dropSelection = useCallback(
    (target: ThreadDropTarget) => {
      if (target.type === "archive") {
        requestBulkAction({ type: "archive" });
        return;
      }
      if (target.type === "unread") {
        requestBulkAction({ type: "unread", unread: true });
        return;
      }
      if (target.type === "move") {
        requestBulkAction({
          type: "move",
          destination: target.destination,
        });
        return;
      }
      const destination = collections.find(
        (item) => item.id === target.collectionId,
      );
      if (!destination || folder === collectionViewId(destination.id)) return;
      requestBulkAction({
        type: "collection",
        collectionId: destination.id,
        selected: true,
        removeFromList: destination.kind === "folder",
      });
    },
    [collections, folder, requestBulkAction],
  );

  if (searchState.query !== querySearch) {
    setSearchState((current) => ({
      query: querySearch,
      value:
        current.value.trim() === current.query ? querySearch : current.value,
    }));
  }

  const search = searchState.value;

  useEffect(() => {
    const next = search.trim();
    if (next === (query.q ?? "")) return;
    const handle = window.setTimeout(() => {
      router.replace(
        mailFolderHref(
          folder,
          { ...query, q: next || undefined, offset: 0 },
          account.id,
        ),
        { scroll: false },
      );
    }, 250);
    return () => window.clearTimeout(handle);
  }, [account.id, folder, query, router, search]);

  const filtered = Boolean(
    query.q?.trim() || query.unread || query.hasAttachment,
  );
  const paneMeta = filtered
    ? `${initialPage.total} ${initialPage.total === 1 ? "result" : "results"}`
    : undefined;

  const updateQuery = (patch: Partial<ThreadListQuery>) => {
    router.replace(
      mailFolderHref(folder, { ...query, ...patch, offset: 0 }, account.id),
      { scroll: false },
    );
  };

  return (
    <>
      <PaneHeader
        title={title}
        titleHidden
        tools={
          <ListToolbar
            account={account}
            folder={folder}
            collections={collections}
            collection={collection}
            query={{ ...query, q: search }}
            supportsSort={account.capabilities.includes("sort")}
            selectionTargets={selectionTargets}
            selectedThreadIds={selectedThreadIds}
            bulkActing={Boolean(bulkActionRequest)}
            bulkActionStatus={bulkActionStatus}
            onBulkAction={requestBulkAction}
            onSelectionChange={replaceSelection}
            onSearch={(value) =>
              setSearchState((current) => ({ ...current, value }))
            }
            onQuery={updateQuery}
          />
        }
        meta={paneMeta}
      />
      <FolderResults
        key={threadQueryToSearch(query).toString()}
        folder={folder}
        initialPage={initialPage}
        query={query}
        selectedThreadIds={selectedThreadIds}
        onSelectionChange={updateSelection}
        onToggleSelectedUnread={toggleSelectedUnread}
        onToggleActiveUnread={toggleActiveUnread}
        onSelectionTargetsChange={updateSelectionTargets}
        selectionResetKey={selectionResetKey}
        bulkActionRequest={bulkActionRequest}
        onBulkActionComplete={completeBulkAction}
        onSelectionDrop={dropSelection}
      />
    </>
  );
}

function FolderResults({
  folder,
  initialPage,
  query,
  selectedThreadIds,
  onSelectionChange,
  onToggleSelectedUnread,
  onToggleActiveUnread,
  onSelectionTargetsChange,
  selectionResetKey,
  bulkActionRequest,
  onBulkActionComplete,
  onSelectionDrop,
}: {
  folder: MailViewId;
  initialPage: ThreadListPage;
  query: ThreadListQuery;
  selectedThreadIds: ReadonlySet<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onToggleSelectedUnread: () => void;
  onToggleActiveUnread: (threadId: string) => void;
  onSelectionTargetsChange: (targets: ThreadSelectionTargets) => void;
  selectionResetKey: number;
  bulkActionRequest: ThreadBulkActionRequest | null;
  onBulkActionComplete: (
    id: number,
    result: ThreadBulkActionResult,
  ) => void;
  onSelectionDrop: (target: ThreadDropTarget) => void;
}) {
  const router = useRouter();
  const {
    account,
    collections,
    adjustArchiveCounts,
    adjustMoveCounts,
    adjustStarredCounts,
    adjustUnreadCounts,
    openThreadComposer,
    updateThreadViewUnread,
    compose,
    pending,
    preferences,
    recallSend,
    sendPendingNow,
    settlePendingSend,
  } = useMailShell();
  const [threads, setThreads] = useState(initialPage.threads);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [sourcePage, setSourcePage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [keyboardActiveThreadId, setKeyboardActiveThreadId] = useState<
    string | null
  >(null);
  const renderedThreadIds = useMemo(
    () => new Set(threads.map((thread) => thread.id)),
    [threads],
  );
  const collection = collections.find(
    (item) => item.id === collectionIdFromView(folder),
  );
  const emptyState = collection
    ? collection.kind === "label"
      ? {
          title: "No conversations with this label",
          hint: "Add this label from any conversation to find it here.",
        }
      : {
          title: "This folder is empty",
          hint: "Move a conversation here to keep related mail together.",
        }
    : undefined;

  const archiveActiveThread = useCallback(
    async (threadId: string) => {
      const thread = threads.find((item) => item.id === threadId);
      if (!thread) return;
      if (folder === "archived") {
        await persistThreadMove(account.id, threadId, "inbox", folder);
        adjustMoveCounts(folder, "inbox", thread.unread, 1);
      } else {
        await persistThreadArchive(account.id, threadId, folder);
        adjustArchiveCounts(folder, thread.unread, 1);
      }
      setThreads((current) => current.filter((item) => item.id !== threadId));
      onSelectionChange(
        new Set([...selectedThreadIds].filter((id) => id !== threadId)),
      );
      void invalidateMailAccountCache(account.id).catch(() => null);
    },
    [
      account.id,
      adjustArchiveCounts,
      adjustMoveCounts,
      folder,
      onSelectionChange,
      selectedThreadIds,
      threads,
    ],
  );

  const deleteDraft = useCallback(
    async (threadId: string, draftId?: string) => {
      if (!draftId) return;
      await removeDraft(account.id, draftId);
      setThreads((current) => current.filter((item) => item.id !== threadId));
      onSelectionChange(
        new Set([...selectedThreadIds].filter((id) => id !== threadId)),
      );
      void invalidateMailAccountCache(account.id).catch(() => null);
    },
    [account.id, onSelectionChange, selectedThreadIds],
  );

  if (sourcePage !== initialPage) {
    setSourcePage(initialPage);
    setThreads(initialPage.threads);
    setHasMore(initialPage.hasMore);
  }

  useEffect(() => {
    for (const item of pending) {
      if (
        !item.input.inReplyTo &&
        item.status === "sent" &&
        item.delivery?.threadId &&
        renderedThreadIds.has(item.delivery.threadId)
      ) {
        settlePendingSend(item.id);
      }
    }
  }, [pending, renderedThreadIds, settlePendingSend]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keybinds = preferences.keybinds;
      if (isTyping(event)) {
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.toggleRead,
          preferences.singleKeyShortcuts,
        )
      ) {
        if (selectedThreadIds.size > 0) {
          event.preventDefault();
          onToggleSelectedUnread();
          return;
        }
        if (keyboardActiveThreadId) {
          event.preventDefault();
          onToggleActiveUnread(keyboardActiveThreadId);
          return;
        }
      }

      const activeThreadId =
        keyboardActiveThreadId ??
        (selectedThreadIds.size === 1
          ? selectedThreadIds.values().next().value
          : undefined);
      if (
        activeThreadId &&
        !isTyping(event) &&
        (enabledKeybindMatchesEvent(
          event,
          keybinds.reply,
          preferences.singleKeyShortcuts,
        ) ||
          enabledKeybindMatchesEvent(
            event,
            keybinds.forward,
            preferences.singleKeyShortcuts,
          ) ||
          enabledKeybindMatchesEvent(
            event,
            keybinds.archive,
            preferences.singleKeyShortcuts,
          ))
      ) {
        event.preventDefault();
        if (
          enabledKeybindMatchesEvent(
            event,
            keybinds.archive,
            preferences.singleKeyShortcuts,
          )
        ) {
          void archiveActiveThread(activeThreadId);
          return;
        }
        const mode = enabledKeybindMatchesEvent(
          event,
          keybinds.reply,
          preferences.singleKeyShortcuts,
        )
          ? "reply"
          : "forward";
        openThreadComposer(activeThreadId, mode);
        router.push(mailThreadHref(folder, activeThreadId, query, account.id));
        return;
      }

      const movingDown =
        enabledKeybindMatchesEvent(
          event,
          keybinds.moveNext,
          preferences.singleKeyShortcuts,
        );
      const movingUp =
        enabledKeybindMatchesEvent(
          event,
          keybinds.movePrev,
          preferences.singleKeyShortcuts,
        );
      if (movingDown || movingUp) {
        if (threads.length === 0) return;
        event.preventDefault();
        setKeyboardActiveThreadId((currentId) => {
          const currentIndex = threads.findIndex(
            (thread) => thread.id === currentId,
          );
          const nextIndex =
            currentIndex < 0
              ? movingDown
                ? 0
                : threads.length - 1
              : Math.max(
                  0,
                  Math.min(
                    threads.length - 1,
                    currentIndex + (movingDown ? 1 : -1),
                  ),
                );
          return threads[nextIndex]?.id ?? null;
        });
        return;
      }

      if (
        keyboardActiveThreadId &&
        (enabledKeybindMatchesEvent(
          event,
          keybinds.openThread,
          preferences.singleKeyShortcuts,
        ) ||
          enabledKeybindMatchesEvent(
            event,
            keybinds.toggleSelect,
            preferences.singleKeyShortcuts,
          )) &&
        !(event.target instanceof Element &&
          event.target.closest("a, button, input, select, textarea"))
      ) {
        event.preventDefault();
        if (
          enabledKeybindMatchesEvent(
            event,
            keybinds.toggleSelect,
            preferences.singleKeyShortcuts,
          )
        ) {
          const next = new Set(selectedThreadIds);
          if (next.has(keyboardActiveThreadId)) {
            next.delete(keyboardActiveThreadId);
          } else {
            next.add(keyboardActiveThreadId);
          }
          onSelectionChange(next);
        } else {
          router.push(
            mailThreadHref(folder, keyboardActiveThreadId, query, account.id),
          );
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    account.id,
    folder,
    keyboardActiveThreadId,
    onToggleActiveUnread,
    onToggleSelectedUnread,
    onSelectionChange,
    openThreadComposer,
    archiveActiveThread,
    preferences.keybinds,
    preferences.singleKeyShortcuts,
    query,
    router,
    selectedThreadIds,
    threads,
  ]);

  return (
    <div {...stylex.props(styles.readerList)}>
      {loadError ? (
        <div role="alert" {...stylex.props(styles.empty)}>
          <div {...stylex.props(styles.emptyTitle)}>
            Couldn’t load more messages
          </div>
          <div {...stylex.props(styles.emptyHint)}>
            Check your connection, then try again.
          </div>
          <Button type="button" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {pending
            .filter(
              (item) =>
                !item.input.inReplyTo &&
                !(
                  item.status === "sent" &&
                  item.delivery?.threadId &&
                  renderedThreadIds.has(item.delivery.threadId)
                ),
            )
            .map((item) => (
              <PendingSendRow
                key={item.id}
                pending={item}
                onUndo={() => recallSend(item.id)}
                onSendNow={() => sendPendingNow(item.id)}
              />
            ))}
          <ThreadList
            account={account}
            folder={folder}
            threads={threads}
            query={query}
            hasMore={hasMore}
            loadingMore={loadingMore}
            hrefForThread={(id) =>
              mailThreadHref(folder, id, query, account.id)
            }
            onCompose={compose}
            onUnreadChange={adjustUnreadCounts}
            onThreadUnreadChange={updateThreadViewUnread}
            onArchive={adjustArchiveCounts}
            onDelete={deleteDraft}
            onMove={adjustMoveCounts}
            onStar={adjustStarredCounts}
            onMore={() => void loadMore()}
            density={preferences.density}
            messagePreview={preferences.messagePreview}
            keybinds={preferences.keybinds}
            singleKeyShortcuts={preferences.singleKeyShortcuts}
            emptyState={emptyState}
            selectedThreadIds={selectedThreadIds}
            keyboardActiveThreadId={keyboardActiveThreadId}
            onSelectionChange={onSelectionChange}
            onSelectionTargetsChange={onSelectionTargetsChange}
            selectionResetKey={selectionResetKey}
            bulkActionRequest={bulkActionRequest}
            onBulkActionComplete={onBulkActionComplete}
            onSelectionDrop={onSelectionDrop}
          />
        </>
      )}
    </div>
  );

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadError(false);
    const params = threadQueryToSearch({
      ...query,
      limit: PAGE_SIZE,
      offset: threads.length,
    });
    params.set("folder", folder);
    params.set("account", account.id);
    const response = await fetch(`/api/mail/threads?${params}`).catch(() => null);
    if (!response?.ok) {
      setLoadError(true);
      setLoadingMore(false);
      return;
    }
    const page = (await response.json()) as ThreadListPage;
    setThreads((current) => [...current, ...page.threads]);
    setHasMore(page.hasMore);
    setLoadingMore(false);
  }
}

export function ThreadRoute({
  folder,
  detail,
  query,
}: {
  folder: MailViewId;
  detail: ThreadDetail;
  query: ThreadListQuery;
}) {
  const router = useRouter();
  const {
    account,
    collections,
    adjustArchiveCounts,
    adjustMoveCounts,
    adjustStarredCounts,
    adjustUnreadCounts,
    userEmail,
    sessionUser,
    ownEmails,
    userName,
    pending,
    recalled,
    clearRecalled,
    sending,
    registerView,
    updateThreadViewUnread,
    recallSend,
    sendPendingNow,
    settlePendingSend,
    sendCompose,
    rememberFolderPage,
    getFolderPage,
    preferences,
    threadComposeIntent,
    clearThreadComposeIntent,
  } = useMailShell();
  const [replyMode, setReplyMode] = useState<ReplyMode | null>(null);
  const [animateReplyComposer, setAnimateReplyComposer] = useState(true);
  const [unreadState, setUnreadState] = useState({
    threadId: detail.id,
    unread: detail.unread,
  });
  const autoReadThread = useRef<string | null>(null);
  if (unreadState.threadId !== detail.id) {
    setUnreadState({ threadId: detail.id, unread: detail.unread });
  }
  const threadUnread =
    unreadState.threadId === detail.id ? unreadState.unread : detail.unread;
  const href = mailThreadHref(folder, detail.id, query, account.id);
  const queryString = threadQueryToSearch({
    ...query,
    limit: undefined,
    offset: 0,
  }).toString();
  const navigationKey = folderPageCacheKey(folder, queryString);
  const [navigationState, setNavigationState] = useState<{
    key: string;
    page: ThreadListPage | null;
  }>(() => ({
    key: navigationKey,
    page: getFolderPage(folder, queryString),
  }));
  const navigationPage =
    navigationState.key === navigationKey
      ? navigationState.page
      : getFolderPage(folder, queryString);

  useEffect(() => {
    if (navigationPage) return;

    let active = true;
    const params = new URLSearchParams(queryString);
    params.set("folder", folder);
    params.set("account", account.id);
    void fetch(`/api/mail/threads?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((page: ThreadListPage | null) => {
        if (!active || !page) return;
        rememberFolderPage(folder, queryString, page);
        setNavigationState({ key: navigationKey, page });
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [
    account.id,
    folder,
    navigationKey,
    navigationPage,
    queryString,
    rememberFolderPage,
  ]);

  useEffect(() => {
    document.title = `${detail.subject || "Conversation"} · Remail`;
  }, [detail.subject]);

  useEffect(() => {
    if (!threadUnread || autoReadThread.current === detail.id) return;
    autoReadThread.current = detail.id;
    setUnreadState({ threadId: detail.id, unread: false });
    adjustUnreadCounts(folder, -1);
    void persistThreadUnread(account.id, detail.id, false)
      .then(() => {
        void invalidateMailAccountCache(account.id).catch(() => null);
      })
      .catch(() => {
        autoReadThread.current = null;
        setUnreadState({ threadId: detail.id, unread: true });
        adjustUnreadCounts(folder, 1);
        updateThreadViewUnread(detail.id, true);
      });
  }, [
    account.id,
    adjustUnreadCounts,
    detail.id,
    folder,
    threadUnread,
    updateThreadViewUnread,
  ]);

  useEffect(() => {
    registerView({
      id: threadTabId(account.id, detail.id),
      kind: "thread",
      title: detail.subject || "No subject",
      threadId: detail.id,
      href,
      unread: false,
    });
  }, [account.id, detail.id, detail.subject, href, registerView]);

  const recalledReply = Boolean(
    recalled?.input.inReplyTo &&
      detail.messages.some((message) => message.id === recalled.input.inReplyTo),
  );
  const effectiveReplyMode = replyMode ?? (recalledReply ? "reply" : null);
  const navigationThreads = navigationPage?.threads ?? EMPTY_THREADS;
  const threadIndex = navigationThreads.findIndex((thread) => thread.id === detail.id);
  const previousThread = threadIndex > 0 ? navigationThreads[threadIndex - 1] : null;
  const nextThread =
    threadIndex >= 0 && threadIndex < navigationThreads.length - 1
      ? navigationThreads[threadIndex + 1]
      : null;

  const updateReplyMode = useCallback(
    (next: ReplyMode | null) => {
      setAnimateReplyComposer(effectiveReplyMode === null && next !== null);
      if (!next) clearRecalled();
      setReplyMode(next);
    },
    [clearRecalled, effectiveReplyMode],
  );

  useEffect(() => {
    if (threadComposeIntent?.threadId !== detail.id) return;
    const frame = window.requestAnimationFrame(() => {
      updateReplyMode(threadComposeIntent.mode);
      clearThreadComposeIntent();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    clearThreadComposeIntent,
    detail.id,
    threadComposeIntent,
    updateReplyMode,
  ]);

  const toggleThreadUnread = useCallback(() => {
    const unread = !threadUnread;
    setUnreadState({ threadId: detail.id, unread });
    updateThreadViewUnread(detail.id, unread);
    adjustUnreadCounts(folder, unread ? 1 : -1);
    void persistThreadUnread(account.id, detail.id, unread)
      .then(() => {
        void invalidateMailAccountCache(account.id).catch(() => null);
      })
      .catch(() => {
        setUnreadState({ threadId: detail.id, unread: !unread });
        updateThreadViewUnread(detail.id, !unread);
        adjustUnreadCounts(folder, unread ? -1 : 1);
      });
  }, [
    account.id,
    adjustUnreadCounts,
    detail.id,
    folder,
    threadUnread,
    updateThreadViewUnread,
  ]);

  const returnToFolder = useCallback(() => {
    window.location.replace(mailFolderHref(folder, query, account.id));
  }, [account.id, folder, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keybinds = preferences.keybinds;
      if (
        isTyping(event)
      ) {
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.reply,
          preferences.singleKeyShortcuts,
        )
      ) {
        event.preventDefault();
        updateReplyMode("reply");
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.forward,
          preferences.singleKeyShortcuts,
        )
      ) {
        event.preventDefault();
        updateReplyMode("forward");
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.archive,
          preferences.singleKeyShortcuts,
        ) &&
        account.capabilities.includes("archive")
      ) {
        event.preventDefault();
        const archiveRequest = folder === "archived"
          ? persistThreadMove(account.id, detail.id, "inbox", folder)
          : persistThreadArchive(account.id, detail.id, folder);
        void archiveRequest
          .then(() => invalidateMailAccountCache(account.id))
          .then(() => {
            if (folder === "archived") {
              adjustMoveCounts(folder, "inbox", threadUnread, 1);
            } else {
              adjustArchiveCounts(folder, threadUnread, 1);
            }
            returnToFolder();
          });
        return;
      }
      if (
        enabledKeybindMatchesEvent(
          event,
          keybinds.toggleRead,
          preferences.singleKeyShortcuts,
        ) &&
        account.capabilities.includes("markUnread")
      ) {
        event.preventDefault();
        toggleThreadUnread();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    account.capabilities,
    account.id,
    adjustArchiveCounts,
    adjustMoveCounts,
    detail.id,
    folder,
    returnToFolder,
    threadUnread,
    preferences.keybinds,
    preferences.singleKeyShortcuts,
    toggleThreadUnread,
    updateReplyMode,
  ]);

  return (
    <>
      <PaneHeader
        title={detail.subject || "No subject"}
        tools={
          <ThreadToolbar
            messageCount={detail.messages.length}
            mode={effectiveReplyMode}
            starred={Boolean(detail.favorite)}
            folder={folder}
            collections={collections}
            selectedCollectionIds={detail.collectionIds ?? []}
            canMarkUnread={account.capabilities.includes("markUnread")}
            canStar={account.capabilities.includes("star")}
            canArchive={account.capabilities.includes("archive")}
            canSpam={account.capabilities.includes("spam")}
            canTrash={account.capabilities.includes("trash")}
            hasPrevious={Boolean(previousThread)}
            hasNext={Boolean(nextThread)}
            onMode={updateReplyMode}
            onMarkUnread={async () => {
              await persistThreadUnread(account.id, detail.id, true);
              await invalidateMailAccountCache(account.id);
              updateThreadViewUnread(detail.id, true);
              adjustUnreadCounts(folder, 1);
              returnToFolder();
            }}
            onStar={async (starred) => {
              await persistThreadStarred(account.id, detail.id, starred);
              await invalidateMailAccountCache(account.id);
              adjustStarredCounts(starred, 1);
              if (!starred && folder === "starred") returnToFolder();
              else router.refresh();
            }}
            onArchive={async () => {
              await persistThreadArchive(account.id, detail.id, folder);
              await invalidateMailAccountCache(account.id);
              adjustArchiveCounts(folder, threadUnread, 1);
              returnToFolder();
            }}
            onMove={async (destination) => {
              await persistThreadMove(
                account.id,
                detail.id,
                destination,
                folder,
              );
              await invalidateMailAccountCache(account.id);
              adjustMoveCounts(folder, destination, threadUnread, 1);
              returnToFolder();
            }}
            onCollection={async (collection, selected) => {
              await persistThreadCollection(
                account.id,
                detail.id,
                collection.id,
                selected,
                folder,
              );
              await invalidateMailAccountCache(account.id);
              if (collection.kind === "folder") {
                router.replace(
                  mailFolderHref(
                    collectionViewId(collection.id),
                    undefined,
                    account.id,
                  ),
                );
              } else if (
                !selected &&
                collectionViewId(collection.id) === folder
              ) {
                returnToFolder();
                return;
              }
              router.refresh();
            }}
            onPrevious={() => {
              if (previousThread) {
                router.push(
                  mailThreadHref(
                    folder,
                    previousThread.id,
                    query,
                    account.id,
                  ),
                );
              }
            }}
            onNext={() => {
              if (nextThread) {
                router.push(
                  mailThreadHref(folder, nextThread.id, query, account.id),
                );
              }
            }}
          />
        }
      />
      <div {...stylex.props(styles.reader)}>
        <ThreadView
          accountId={account.id}
          detail={detail}
          userEmail={userEmail}
          ownEmails={ownEmails}
          senderEmail={defaultSenderEmail(
            account.email,
            preferences.defaultSenderAlias,
            sessionUser.email,
          )}
          userName={userName}
          sending={sending}
          pending={pending}
          onUndo={recallSend}
          onSendNow={sendPendingNow}
          onSettled={settlePendingSend}
          recalled={recalled?.input ?? null}
          mode={effectiveReplyMode}
          animateComposerEntrance={animateReplyComposer}
          onMode={updateReplyMode}
          onSend={async (input, files) => {
            const error = await sendCompose(input, files);
            if (!error) {
              setAnimateReplyComposer(true);
              setReplyMode(null);
            }
            return error;
          }}
          loadRemoteImages={preferences.loadRemoteImages}
          includeRedaktFooter={preferences.includeRedaktFooter}
          theme={preferences.theme}
        />
      </div>
    </>
  );
}

function attachmentData(content: NonNullable<ThreadDetail["messages"][number]["attachments"][number]["content"]>) {
  if (typeof content === "string") return content;
  const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function DraftRoute({ detail }: { detail: ThreadDetail }) {
  const router = useRouter();
  const { account, openDraft } = useMailShell();

  useEffect(() => {
    const message = detail.messages.at(-1);
    if (!message || !detail.draftId) return;
    openDraft({
      from: message.from.email || undefined,
      to: message.to.map((address) => address.email).join(", "),
      cc: message.cc?.map((address) => address.email).join(", ") ?? "",
      bcc: message.bcc?.map((address) => address.email).join(", ") ?? "",
      subject: message.subject,
      text: message.text ?? "",
      html: message.html,
      draftId: detail.draftId,
      attachments: message.attachments.flatMap((attachment) =>
        attachment.content
          ? [
              {
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                size: attachment.size,
                data: attachmentData(attachment.content),
              },
            ]
          : [],
      ),
    });
    router.replace(mailFolderHref("drafts", undefined, account.id));
  }, [account.id, detail, openDraft, router]);

  return <MailFolderLoading />;
}

export function MailRouteError({ reset }: { reset: () => void }) {
  return (
    <>
      <PaneHeader title="Unable to load mail" />
      <div role="alert" {...stylex.props(styles.empty)}>
        <div {...stylex.props(styles.emptyTitle)}>Couldn’t load this page</div>
        <div {...stylex.props(styles.emptyHint)}>
          Check your connection, then try again.
        </div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </>
  );
}

export function MailRouteNotFound() {
  const { account } = useMailShell();
  return (
    <>
      <PaneHeader title="Page not found" />
      <div {...stylex.props(styles.empty)}>
        <div {...stylex.props(styles.emptyTitle)}>This mail page doesn’t exist</div>
        <div {...stylex.props(styles.emptyHint)}>
          The folder or conversation may have moved.
        </div>
        <Link
          href={mailFolderHref("inbox", undefined, account.id)}
          {...stylex.props(styles.action)}
        >
          Open inbox
        </Link>
      </div>
    </>
  );
}

function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  return Boolean(
    target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable),
  );
}
