"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";
import { Menu } from "@/components/ui/menu";
import { SelectionCheckbox } from "@/components/mail/selection-checkbox";
import { useThreadDragControls } from "@/components/mail/thread-drag";
import { formatShortWhen } from "@/lib/format";
import {
  persistThreadArchive,
  persistThreadCollection,
  persistThreadMove,
  persistThreadStarred,
  persistThreadUnread,
} from "@/lib/mail/thread-state";
import {
  collectThreadSelectionTargets,
  updateThreadSelection,
  type ThreadBulkActionRequest,
  type ThreadBulkActionResult,
  type ThreadSelectionTargets,
} from "@/lib/mail/thread-selection";
import type { ThreadDropTarget } from "@/lib/mail/thread-drag";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import type { MailAccount, MailViewId, Thread } from "@/lib/mail/types";
import type {
  DensityPreference,
  MessagePreviewPreference,
} from "@/lib/preferences";
import { ThreadListSkeletonRows } from "./loading-state";

const ROW_HIDE_DURATION = 0.18;
const ROW_REFLOW_DELAY = 1;
const rowExitTransition = {
  opacity: { duration: ROW_HIDE_DURATION, ease: "easeOut" as const },
  scale: { duration: ROW_HIDE_DURATION, ease: "easeOut" as const },
  height: {
    delay: ROW_REFLOW_DELAY,
    duration: 0.28,
    ease: [0.2, 0, 0, 1] as [number, number, number, number],
  },
};

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "100%",
    paddingInline: space[2],
    paddingBlock: space[1],
    gap: 0,
  },
  row: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover },
    },
  },
  rowHot: {
    backgroundColor: colors.surfaceHover,
  },
  rowSelected: {
    backgroundColor: colors.surfaceActive,
    ":has(+ [data-selected='true'])": {
      borderEndStartRadius: 0,
      borderEndEndRadius: 0,
    },
    ":is([data-selected='true'] + [data-selected='true'])": {
      borderStartStartRadius: 0,
      borderStartEndRadius: 0,
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceActive },
    },
  },
  selectionCell: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: space[1],
    zIndex: 2,
    display: "flex",
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  open: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    width: "100%",
    minHeight: 40,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    paddingBlock: 10,
    paddingInlineStart: `calc(${space[3]} + 32px)`,
    paddingInlineEnd: space[3],
    cursor: "pointer",
    textAlign: "start",
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    color: "inherit",
    textDecoration: "none",
  },
  openDragSource: {
    cursor: "grab",
  },
  openCompact: { minHeight: 34, paddingBlock: 5 },
  openTwoLines: { minHeight: 52 },
  openTwoLinesCompact: { minHeight: 44, paddingBlock: 6 },
  dotSlot: {
    width: 8,
    height: 8,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "oklch(0.62 0.19 250)",
  },
  sender: {
    flexShrink: 0,
    width: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.textMuted,
    fontWeight: 450,
  },
  senderUnread: {
    color: colors.text,
    fontWeight: 600,
  },
  body: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  bodyTwoLines: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    whiteSpace: "normal",
  },
  subject: {
    color: colors.textMuted,
    fontWeight: 450,
  },
  subjectUnread: {
    color: colors.text,
    fontWeight: 600,
  },
  snippet: {
    color: colors.textFaint,
    fontWeight: 450,
  },
  snippetTwoLines: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  when: {
    flexShrink: 0,
    width: 104,
    textAlign: "end",
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontVariantNumeric: "tabular-nums",
    opacity: 1,
    "@media (hover: none)": {
      width: "4.5em",
    },
  },
  whenUnread: {
    color: colors.textMuted,
    fontWeight: 500,
  },
  whenHidden: {
    opacity: 0,
  },
  actions: {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: space[3],
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    width: 104,
    opacity: 0,
    pointerEvents: "none",
    "@media (hover: none)": {
      opacity: 1,
      pointerEvents: "auto",
      width: 32,
      insetInlineEnd: `calc(${space[3]} + 4.5em)`,
    },
  },
  actionsOpen: {
    opacity: 1,
    pointerEvents: "auto",
  },
  inlineActions: {
    display: "contents",
    "@media (hover: none)": { display: "none" },
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space[1],
    padding: space[6],
    color: colors.textFaint,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: fonts.uiSize,
    fontWeight: 500,
    color: colors.textMuted,
  },
  emptyHint: {
    fontSize: fonts.captionSize,
    color: colors.textFaint,
    maxWidth: "32ch",
  },
  emptyAction: {
    marginTop: space[3],
  },
  more: {
    display: "flex",
    justifyContent: "center",
    paddingBlock: space[3],
  },
  moreBusy: {
    color: colors.textFaint,
    cursor: "wait",
  },
  count: {
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  match: {
    padding: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    color: "inherit",
  },
});

function HighlightedText({ text, query }: { text: string; query?: string }) {
  const needle = query?.trim();
  if (!needle) return text;

  const source = text.toLocaleLowerCase();
  const match = needle.toLocaleLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = source.indexOf(match);

  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={`${index}-${cursor}`} {...stylex.props(styles.match)}>
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    cursor = index + needle.length;
    index = source.indexOf(match, cursor);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? parts : text;
}

function ThreadRow({
  thread,
  href,
  query,
  onRead,
  density,
  messagePreview,
  onArchive,
  onMove,
  onStar,
  canArchive,
  canSpam,
  canStar,
  canTrash,
  selected,
  onSelect,
  dragEnabled,
  onDragPointerDown,
  onOpenClickCapture,
  reduceMotion,
}: {
  thread: Thread;
  href: string;
  query?: string;
  onRead: (id: string) => void;
  density: DensityPreference;
  messagePreview: MessagePreviewPreference;
  onArchive: (id: string) => void;
  onMove: (id: string, destination: "inbox" | "spam" | "trash") => void;
  onStar: (id: string) => void;
  canArchive: boolean;
  canSpam: boolean;
  canStar: boolean;
  canTrash: boolean;
  selected: boolean;
  onSelect: (id: string, range: boolean) => void;
  dragEnabled: boolean;
  onDragPointerDown: React.PointerEventHandler<HTMLAnchorElement>;
  onOpenClickCapture: React.MouseEventHandler<HTMLAnchorElement>;
  reduceMotion: boolean;
}) {
  const isPresent = useIsPresent();
  const [hot, setHot] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const showActions = hot || menuOpen;
  const title = `${thread.from.name || thread.from.email}: ${thread.subject}`;
  const actionTab = showActions ? 0 : -1;

  return (
    <motion.div
      data-selected={selected || undefined}
      inert={isPresent ? undefined : true}
      animate={{ height: "auto", opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { height: 0, opacity: 0 }
          : { height: 0, opacity: 0, scale: 0.985 }
      }
      transition={reduceMotion ? { duration: 0 } : rowExitTransition}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setHot(false);
        }
      }}
      {...stylex.props(
        styles.row,
        showActions && styles.rowHot,
        selected && styles.rowSelected,
      )}
    >
      <label {...stylex.props(styles.selectionCell)}>
        <SelectionCheckbox
          checked={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${title}`}
          onClick={(event) => onSelect(thread.id, event.shiftKey)}
        />
      </label>
      <IntentPrefetchLink
        href={href}
        draggable={false}
        title={title}
        onPointerDown={onDragPointerDown}
        onClickCapture={onOpenClickCapture}
        onClick={(event) => {
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
            if (!event.defaultPrevented) {
              document.title = `${thread.subject || "Conversation"} · Remail`;
            }
            return;
          }
          event.preventDefault();
          onSelect(thread.id, event.shiftKey);
        }}
        {...stylex.props(
          styles.open,
          dragEnabled && styles.openDragSource,
          density === "compact" && styles.openCompact,
          messagePreview === "two" && styles.openTwoLines,
          density === "compact" &&
            messagePreview === "two" &&
            styles.openTwoLinesCompact,
        )}
      >
        <span {...stylex.props(styles.dotSlot)} aria-hidden="true">
          {thread.unread ? <span {...stylex.props(styles.dot)} /> : null}
        </span>
        {thread.unread ? <span className="sr-only">Unread</span> : null}
        <span {...stylex.props(styles.sender, thread.unread && styles.senderUnread)}>
          <HighlightedText text={thread.from.name || thread.from.email} query={query} />
        </span>
        <span
          {...stylex.props(
            styles.body,
            messagePreview === "two" && styles.bodyTwoLines,
          )}
        >
          <span {...stylex.props(styles.subject, thread.unread && styles.subjectUnread)}>
            <HighlightedText text={thread.subject || "No subject"} query={query} />
            {thread.messageCount > 1 ? (
              <span {...stylex.props(styles.count)}>{` · ${thread.messageCount}`}</span>
            ) : null}
          </span>
          {messagePreview !== "hidden" ? (
            <span
              {...stylex.props(
                styles.snippet,
                messagePreview === "two" && styles.snippetTwoLines,
              )}
            >
            {thread.snippet ? (
              <>
                {messagePreview === "one" ? " — " : null}
                <HighlightedText text={thread.snippet} query={query} />
              </>
            ) : null}
            </span>
          ) : null}
        </span>
        <span
          {...stylex.props(
            styles.when,
            thread.unread && styles.whenUnread,
            showActions && styles.whenHidden,
          )}
        >
          {formatShortWhen(thread.date)}
        </span>
      </IntentPrefetchLink>
      <span {...stylex.props(styles.actions, showActions && styles.actionsOpen)}>
        <span {...stylex.props(styles.inlineActions)}>
          <IconButton
            type="button"
            tabIndex={actionTab}
            aria-label={thread.unread ? "Mark as read" : "Mark as unread"}
            onClick={() => onRead(thread.id)}
          >
            <Icons.check size={15} />
          </IconButton>
          {canArchive && thread.folder !== "archived" ? (
            <IconButton
              type="button"
              tabIndex={actionTab}
              aria-label="Archive"
              onClick={() => onArchive(thread.id)}
            >
              <Icons.archived size={15} />
            </IconButton>
          ) : null}
        </span>
        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Trigger
            render={
              <IconButton
                type="button"
                tabIndex={actionTab}
                aria-label="More actions"
              />
            }
          >
            <Icons.more size={15} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end">
              <Menu.Popup>
                <Menu.Item onClick={() => onRead(thread.id)}>
                  <Menu.Icon>
                    {thread.unread ? (
                      <Icons.check size={16} />
                    ) : (
                      <Icons.unreadMail size={16} />
                    )}
                  </Menu.Icon>
                  <Menu.Label>
                    {thread.unread ? "Mark as read" : "Mark as unread"}
                  </Menu.Label>
                </Menu.Item>
                {canStar ? (
                  <Menu.Item onClick={() => onStar(thread.id)}>
                    <Menu.Icon><Icons.star size={16} /></Menu.Icon>
                    <Menu.Label>
                      {thread.favorite ? "Remove star" : "Add star"}
                    </Menu.Label>
                  </Menu.Item>
                ) : null}
                {canArchive && thread.folder !== "archived" ? (
                  <Menu.Item onClick={() => onArchive(thread.id)}>
                    <Menu.Icon><Icons.archived size={16} /></Menu.Icon>
                    <Menu.Label>Archive</Menu.Label>
                  </Menu.Item>
                ) : null}
                {(thread.folder === "spam" || thread.folder === "trash") ? (
                  <Menu.Item onClick={() => onMove(thread.id, "inbox")}>
                    <Menu.Icon><Icons.inbox size={16} /></Menu.Icon>
                    <Menu.Label>Move to inbox</Menu.Label>
                  </Menu.Item>
                ) : null}
                {canSpam && thread.folder !== "spam" ? (
                  <Menu.Item onClick={() => onMove(thread.id, "spam")}>
                    <Menu.Icon><Icons.spam size={16} /></Menu.Icon>
                    <Menu.Label>Mark as spam</Menu.Label>
                  </Menu.Item>
                ) : null}
                {canTrash && thread.folder !== "trash" ? (
                  <Menu.Item onClick={() => onMove(thread.id, "trash")}>
                    <Menu.Icon><Icons.trash size={16} /></Menu.Icon>
                    <Menu.Label>Move to trash</Menu.Label>
                  </Menu.Item>
                ) : null}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </span>
    </motion.div>
  );
}

function ThreadListEmpty({
  searching,
  emptyState,
  onCompose,
}: {
  searching: boolean;
  emptyState?: { title: string; hint: string };
  onCompose?: () => void;
}) {
  return (
    <div {...stylex.props(styles.empty)}>
      <div {...stylex.props(styles.emptyTitle)}>
        {searching
          ? "No matching messages"
          : (emptyState?.title ?? "No messages yet")}
      </div>
      <div {...stylex.props(styles.emptyHint)}>
        {searching
          ? "Try a different search, filter, or folder."
          : (emptyState?.hint ??
            "This folder is empty. Write a message to get started.")}
      </div>
      {!searching && onCompose && !emptyState ? (
        <div {...stylex.props(styles.emptyAction)}>
          <Button type="button" onClick={onCompose}>
            New email
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ThreadList({
  account,
  folder,
  threads,
  query,
  hasMore,
  loadingMore,
  hrefForThread,
  onCompose,
  onUnreadChange,
  onThreadUnreadChange,
  onArchive,
  onMove,
  onStar,
  onMore,
  emptyState,
  density = "comfortable",
  messagePreview = "one",
  selectedThreadIds,
  onSelectionChange,
  onSelectionTargetsChange,
  selectionResetKey,
  bulkActionRequest,
  onBulkActionComplete,
  onSelectionDrop,
}: {
  account: MailAccount;
  folder: MailViewId;
  threads: Thread[];
  query?: { q?: string; unread?: boolean; hasAttachment?: boolean };
  hasMore?: boolean;
  loadingMore?: boolean;
  hrefForThread: (id: string) => string;
  onCompose?: () => void;
  onUnreadChange?: (folder: string, delta: number) => void;
  onThreadUnreadChange?: (id: string, unread: boolean) => void;
  onArchive?: (folder: string, unread: boolean, direction: 1 | -1) => void;
  onMove?: (
    folder: string,
    destination: "inbox" | "spam" | "trash",
    unread: boolean,
    direction: 1 | -1,
  ) => void;
  onStar?: (starred: boolean, direction: 1 | -1) => void;
  onMore?: () => void;
  emptyState?: { title: string; hint: string };
  density?: DensityPreference;
  messagePreview?: MessagePreviewPreference;
  selectedThreadIds: ReadonlySet<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onSelectionTargetsChange: (targets: ThreadSelectionTargets) => void;
  selectionResetKey: number;
  bulkActionRequest: ThreadBulkActionRequest | null;
  onBulkActionComplete: (
    id: number,
    result: ThreadBulkActionResult,
  ) => void;
  onSelectionDrop: (target: ThreadDropTarget) => void;
}) {
  const { beginDrag, updateDrag, finishDrag, cancelDrag } =
    useThreadDragControls();
  const reduceMotion = Boolean(useReducedMotion());
  const [unreadOf, setUnreadOf] = useState<Record<string, boolean>>({});
  const [starredOf, setStarredOf] = useState<Record<string, boolean>>({});
  const [collectionIdsOf, setCollectionIdsOf] = useState<
    Record<string, string[]>
  >({});
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const [showEmptyAfterExit, setShowEmptyAfterExit] = useState(false);
  const updating = useRef(new Set<string>());
  const selectionAnchor = useRef<string | null>(null);
  const processedBulkActionId = useRef<number | null>(null);
  const suppressOpenFor = useRef<string | null>(null);
  const dragGestureCleanup = useRef<(() => void) | null>(null);

  const visible = useMemo(
    () =>
      threads
        .filter((thread) => !removed[thread.id])
        .map((thread) => ({
          ...thread,
          unread: thread.id in unreadOf ? unreadOf[thread.id] : thread.unread,
          favorite:
            thread.id in starredOf ? starredOf[thread.id] : thread.favorite,
          collectionIds:
            thread.id in collectionIdsOf
              ? collectionIdsOf[thread.id]
              : thread.collectionIds,
        })),
    [collectionIdsOf, removed, starredOf, threads, unreadOf],
  );
  const selectionTargets = useMemo(
    () => collectThreadSelectionTargets(visible),
    [visible],
  );
  const visibleIds = selectionTargets.allIds;
  const searching = Boolean(
    query?.q?.trim() || query?.unread || query?.hasAttachment,
  );
  const hasDepartingThreads = threads.some((thread) => removed[thread.id]);

  useEffect(() => {
    selectionAnchor.current = null;
  }, [selectionResetKey]);

  useEffect(
    () => () => {
      dragGestureCleanup.current?.();
      cancelDrag();
    },
    [cancelDrag],
  );

  useEffect(() => {
    onSelectionTargetsChange(selectionTargets);
  }, [onSelectionTargetsChange, selectionTargets]);

  const runBulkAction = useEffectEvent(
    async (request: ThreadBulkActionRequest) => {
      const selectedIds = new Set(request.threadIds);
      const selectedThreads = visible.filter((thread) =>
        selectedIds.has(thread.id),
      );
      const outcomes = await Promise.all(
        selectedThreads.map((thread) => {
          switch (request.action.type) {
            case "unread":
              return setThreadUnread(thread, request.action.unread);
            case "starred":
              return setThreadStarred(thread, request.action.starred);
            case "archive":
              return archiveThread(thread);
            case "move":
              return moveThread(thread, request.action.destination);
            case "collection":
              return applyThreadCollection(thread, request.action);
          }
        }),
      );
      const missing = request.threadIds.length - selectedThreads.length;
      const failed =
        missing + outcomes.reduce((count, outcome) => count + Number(!outcome), 0);
      onBulkActionComplete(request.id, {
        total: request.threadIds.length,
        failed,
      });
    },
  );

  useEffect(() => {
    if (
      !bulkActionRequest ||
      processedBulkActionId.current === bulkActionRequest.id
    ) {
      return;
    }
    processedBulkActionId.current = bulkActionRequest.id;
    void runBulkAction(bulkActionRequest);
  }, [bulkActionRequest]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEntry(event.target)) return;
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLocaleLowerCase() === "a"
      ) {
        if (visibleIds.length === 0) return;
        event.preventDefault();
        selectionAnchor.current = visibleIds[0];
        onSelectionChange(new Set(visibleIds));
        return;
      }
      if (event.key === "Escape" && selectedThreadIds.size > 0) {
        event.preventDefault();
        selectionAnchor.current = null;
        onSelectionChange(new Set());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSelectionChange, selectedThreadIds.size, visibleIds]);

  if (visible.length === 0 && !hasDepartingThreads) {
    return (
      <ThreadListEmpty
        searching={searching}
        emptyState={emptyState}
        onCompose={onCompose}
      />
    );
  }

  return (
    <div aria-busy={loadingMore || undefined} {...stylex.props(styles.list)}>
      <span className="sr-only" role="status">
        {selectedThreadIds.size > 0
          ? `${selectedThreadIds.size} ${selectedThreadIds.size === 1 ? "conversation" : "conversations"} selected`
          : ""}
      </span>
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          if (visible.length === 0) setShowEmptyAfterExit(true);
        }}
      >
        {visible.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            href={hrefForThread(thread.id)}
            query={query?.q}
            density={density}
            messagePreview={messagePreview}
            onRead={() => void setThreadUnread(thread, !thread.unread)}
            onArchive={() => void archiveThread(thread)}
            onMove={(_id, destination) => void moveThread(thread, destination)}
            onStar={() => void setThreadStarred(thread, !thread.favorite)}
            canArchive={account.capabilities.includes("archive")}
            canSpam={account.capabilities.includes("spam")}
            canStar={account.capabilities.includes("star")}
            canTrash={account.capabilities.includes("trash")}
            selected={selectedThreadIds.has(thread.id)}
            onSelect={selectThread}
            dragEnabled={
              selectedThreadIds.has(thread.id) && !bulkActionRequest
            }
            onDragPointerDown={(event) => prepareThreadDrag(event, thread)}
            onOpenClickCapture={(event) => suppressThreadOpen(event, thread.id)}
            reduceMotion={reduceMotion}
          />
        ))}
      </AnimatePresence>
      {visible.length === 0 && showEmptyAfterExit ? (
        <ThreadListEmpty
          searching={searching}
          emptyState={emptyState}
          onCompose={onCompose}
        />
      ) : null}
      {loadingMore ? (
        <>
          <span className="sr-only" role="status">
            Loading more messages
          </span>
          <ThreadListSkeletonRows count={3} />
        </>
      ) : null}
      {hasMore && onMore ? (
        <div {...stylex.props(styles.more)}>
          <Button
            type="button"
            variant="ghost"
            aria-disabled={loadingMore || undefined}
            onClick={() => {
              if (!loadingMore) onMore();
            }}
            {...stylex.props(loadingMore && styles.moreBusy)}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  function selectThread(id: string, range: boolean) {
    const result = updateThreadSelection(
      visibleIds,
      selectedThreadIds,
      id,
      selectionAnchor.current,
      range,
    );
    selectionAnchor.current = result.anchorId;
    onSelectionChange(result.selectedIds);
  }

  function removeThreadFromList(id: string) {
    setShowEmptyAfterExit(false);
    setRemoved((current) => ({ ...current, [id]: true }));
  }

  function prepareThreadDrag(
    event: React.PointerEvent<HTMLAnchorElement>,
    sourceThread: Thread,
  ) {
    if (
      !selectedThreadIds.has(sourceThread.id) ||
      bulkActionRequest ||
      event.button !== 0 ||
      event.pointerType === "touch"
    ) {
      return;
    }

    dragGestureCleanup.current?.();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      if (dragGestureCleanup.current === cleanup) {
        dragGestureCleanup.current = null;
      }
    };

    const onPointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      const point = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      if (!dragging) {
        const distance = Math.hypot(
          pointerEvent.clientX - startX,
          pointerEvent.clientY - startY,
        );
        if (distance < 6) return;
        const selectedThreads = [
          sourceThread,
          ...visible.filter(
            (thread) =>
              thread.id !== sourceThread.id &&
              selectedThreadIds.has(thread.id),
          ),
        ];
        if (selectedThreads.length === 0) return;
        dragging = true;
        suppressOpenFor.current = sourceThread.id;
        beginDrag(
          {
            cards: selectedThreads.slice(0, 4),
            total: selectedThreads.length,
            onDrop: onSelectionDrop,
          },
          point,
        );
      } else {
        updateDrag(point);
      }
      pointerEvent.preventDefault();
    };

    const onPointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      cleanup();
      if (!dragging) return;
      pointerEvent.preventDefault();
      finishDrag({ x: pointerEvent.clientX, y: pointerEvent.clientY });
      window.setTimeout(() => {
        if (suppressOpenFor.current === sourceThread.id) {
          suppressOpenFor.current = null;
        }
      }, 0);
    };

    const onPointerCancel = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      cleanup();
      if (!dragging) return;
      suppressOpenFor.current = null;
      cancelDrag();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    dragGestureCleanup.current = cleanup;
  }

  function suppressThreadOpen(
    event: React.MouseEvent<HTMLAnchorElement>,
    threadId: string,
  ) {
    if (suppressOpenFor.current !== threadId) return;
    event.preventDefault();
    event.stopPropagation();
    suppressOpenFor.current = null;
  }

  async function setThreadUnread(thread: Thread, nextUnread: boolean) {
    if (thread.unread === nextUnread) return true;
    if (updating.current.has(thread.id)) return false;
    updating.current.add(thread.id);
    const delta = nextUnread ? 1 : -1;
    const hideAfterRead =
      !nextUnread && (folder === "smart" || Boolean(query?.unread));

    setUnreadOf((current) => ({ ...current, [thread.id]: nextUnread }));
    onThreadUnreadChange?.(thread.id, nextUnread);
    if (hideAfterRead) {
      removeThreadFromList(thread.id);
    }
    onUnreadChange?.(folder, delta);

    try {
      await persistThreadUnread(account.id, thread.id, nextUnread);
      return true;
    } catch {
      setUnreadOf((current) => ({ ...current, [thread.id]: thread.unread }));
      onThreadUnreadChange?.(thread.id, thread.unread);
      if (hideAfterRead) {
        setRemoved((current) => {
          const next = { ...current };
          delete next[thread.id];
          return next;
        });
      }
      onUnreadChange?.(folder, -delta);
      return false;
    } finally {
      updating.current.delete(thread.id);
    }
  }

  async function archiveThread(thread: Thread) {
    if (folder === "archived") return true;
    if (updating.current.has(thread.id)) return false;
    updating.current.add(thread.id);
    removeThreadFromList(thread.id);
    onArchive?.(folder, thread.unread, 1);

    try {
      await persistThreadArchive(account.id, thread.id, folder);
      return true;
    } catch {
      setRemoved((current) => {
        const next = { ...current };
        delete next[thread.id];
        return next;
      });
      onArchive?.(folder, thread.unread, -1);
      return false;
    } finally {
      updating.current.delete(thread.id);
    }
  }

  async function setThreadStarred(thread: Thread, next: boolean) {
    const current = Boolean(thread.favorite);
    if (current === next) return true;
    if (updating.current.has(thread.id)) return false;
    updating.current.add(thread.id);
    setStarredOf((values) => ({ ...values, [thread.id]: next }));
    if (!next && folder === "starred") {
      removeThreadFromList(thread.id);
    }
    onStar?.(next, 1);
    try {
      await persistThreadStarred(account.id, thread.id, next);
      return true;
    } catch {
      setStarredOf((values) => ({ ...values, [thread.id]: current }));
      if (!next && folder === "starred") {
        setRemoved((values) => {
          const restored = { ...values };
          delete restored[thread.id];
          return restored;
        });
      }
      onStar?.(next, -1);
      return false;
    } finally {
      updating.current.delete(thread.id);
    }
  }

  async function moveThread(
    thread: Thread,
    destination: "inbox" | "spam" | "trash",
  ) {
    if (folder === destination) return true;
    if (updating.current.has(thread.id)) return false;
    updating.current.add(thread.id);
    removeThreadFromList(thread.id);
    onMove?.(folder, destination, thread.unread, 1);
    try {
      await persistThreadMove(account.id, thread.id, destination, folder);
      return true;
    } catch {
      setRemoved((values) => {
        const restored = { ...values };
        delete restored[thread.id];
        return restored;
      });
      onMove?.(folder, destination, thread.unread, -1);
      return false;
    } finally {
      updating.current.delete(thread.id);
    }
  }

  async function applyThreadCollection(
    thread: Thread,
    action: Extract<
      ThreadBulkActionRequest["action"],
      { type: "collection" }
    >,
  ) {
    const currentIds = thread.collectionIds ?? [];
    const alreadySelected = currentIds.includes(action.collectionId);
    if (alreadySelected === action.selected && !action.removeFromList) {
      return true;
    }
    if (updating.current.has(thread.id)) return false;
    updating.current.add(thread.id);
    const nextIds = action.selected
      ? [...new Set([...currentIds, action.collectionId])]
      : currentIds.filter((id) => id !== action.collectionId);
    setCollectionIdsOf((current) => ({ ...current, [thread.id]: nextIds }));
    if (action.removeFromList) {
      removeThreadFromList(thread.id);
    }

    try {
      await persistThreadCollection(
        account.id,
        thread.id,
        action.collectionId,
        action.selected,
        folder,
      );
      return true;
    } catch {
      setCollectionIdsOf((current) => ({
        ...current,
        [thread.id]: currentIds,
      }));
      if (action.removeFromList) {
        setRemoved((current) => {
          const next = { ...current };
          delete next[thread.id];
          return next;
        });
      }
      return false;
    } finally {
      updating.current.delete(thread.id);
    }
  }
}

function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "radio", "reset", "submit"].includes(
    target.type,
  );
}
