"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { FolderMark } from "@/components/mail/folder-mark";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import type { ReplyMode } from "@/components/mail/thread-view";
import type { MailCollection } from "@/lib/mail/types";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space[3],
    minWidth: 0,
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: space[1],
  },
  quickAction: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 32,
    minWidth: 32,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    cursor: "pointer",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
  },
  quickActionActive: {
    backgroundColor: colors.surfaceActive,
    color: colors.text,
  },
  quickActionLabel: {
    whiteSpace: "nowrap",
    "@media (max-width: 1040px)": {
      display: "none",
    },
  },
  secondaryQuickAction: {
    "@media (max-width: 720px)": {
      display: "none",
    },
  },
  compactMenuItem: {
    "@media (min-width: 721px)": {
      display: "none",
    },
  },
  count: {
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    "@media (max-width: 900px)": {
      display: "none",
    },
  },
  optionIcon: {
    display: "inline-flex",
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    color: colors.textMuted,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
  },
});

function copyWithExec(text: string) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.insetInlineStart = "-9999px";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  if (!copied) throw new Error("copy failed");
}

function ActionButton({
  mode,
  currentMode,
  label,
  icon: ActionIcon,
  secondary,
  onMode,
}: {
  mode: ReplyMode;
  currentMode: ReplyMode | null;
  label: string;
  icon: typeof Icons.reply;
  secondary?: boolean;
  onMode: (mode: ReplyMode | null) => void;
}) {
  const active = currentMode === mode;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={() => onMode(active ? null : mode)}
      {...stylex.props(
        styles.quickAction,
        active && styles.quickActionActive,
        secondary && styles.secondaryQuickAction,
      )}
    >
      <ActionIcon size={15} />
      <span {...stylex.props(styles.quickActionLabel)}>{label}</span>
    </button>
  );
}

export function ThreadToolbar({
  messageCount,
  mode,
  starred,
  folder,
  collections,
  selectedCollectionIds,
  canMarkUnread,
  canStar,
  canArchive,
  canSpam,
  canTrash,
  hasPrevious,
  hasNext,
  onMode,
  onMarkUnread,
  onStar,
  onArchive,
  onMove,
  onCollection,
  onPrevious,
  onNext,
}: {
  messageCount: number;
  mode: ReplyMode | null;
  starred: boolean;
  folder: string;
  collections: MailCollection[];
  selectedCollectionIds: string[];
  canMarkUnread: boolean;
  canStar: boolean;
  canArchive: boolean;
  canSpam: boolean;
  canTrash: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onMode: (mode: ReplyMode | null) => void;
  onMarkUnread: () => Promise<void>;
  onStar: (starred: boolean) => Promise<void>;
  onArchive: () => Promise<void>;
  onMove: (destination: "inbox" | "spam" | "trash") => Promise<void>;
  onCollection: (
    collection: MailCollection,
    selected: boolean,
  ) => Promise<void>;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [acting, setActing] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const countLabel = `${messageCount} ${messageCount === 1 ? "message" : "messages"}`;

  const runAction = async (action: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    setActionStatus("");
    try {
      await action();
    } catch {
      setActionStatus("Unable to update this conversation");
    } finally {
      setActing(false);
    }
  };

  const copyLink = async () => {
    setCopyStatus("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        copyWithExec(window.location.href);
      }
      window.setTimeout(() => setCopyStatus("Conversation link copied"), 0);
    } catch {
      try {
        copyWithExec(window.location.href);
        window.setTimeout(() => setCopyStatus("Conversation link copied"), 0);
      } catch {
        window.setTimeout(
          () => setCopyStatus("Unable to copy conversation link"),
          0,
        );
      }
    }
  };

  return (
    <div {...stylex.props(styles.root)}>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus || actionStatus}
      </span>
      <div {...stylex.props(styles.group)}>
        <ActionButton
          mode="reply"
          currentMode={mode}
          label="Reply"
          icon={Icons.reply}
          onMode={onMode}
        />
        <ActionButton
          mode="replyAll"
          currentMode={mode}
          label="Reply all"
          icon={Icons.replyAll}
          secondary
          onMode={onMode}
        />
        <ActionButton
          mode="forward"
          currentMode={mode}
          label="Forward"
          icon={Icons.forward}
          secondary
          onMode={onMode}
        />
        {canArchive && folder !== "archived" ? (
          <IconButton
            type="button"
            aria-label="Archive conversation"
            disabled={acting}
            onClick={() => void runAction(onArchive)}
          >
            <Icons.archived size={15} />
          </IconButton>
        ) : null}
        {collections.length > 0 ? (
          <Menu.Root>
            <Menu.Trigger
              render={
                <IconButton
                  type="button"
                  aria-label={
                    collections[0].kind === "label"
                      ? "Manage labels"
                      : "Move to folder"
                  }
                />
              }
            >
              {collections[0].kind === "label" ? (
                <Icons.tag size={15} />
              ) : (
                <FolderMark tone="neutral" size="compact" />
              )}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="end">
                <Menu.Popup>
                  {collections.map((collection) => {
                    const selected = selectedCollectionIds.includes(
                      collection.id,
                    );
                    const isFolder = collection.kind === "folder";
                    return (
                      <Menu.Item
                        key={collection.id}
                        disabled={acting || (isFolder && selected)}
                        aria-label={
                          isFolder
                            ? `Move to ${collection.name}`
                            : `${selected ? "Remove" : "Add"} label ${collection.name}`
                        }
                        onClick={() =>
                          void runAction(() =>
                            onCollection(
                              collection,
                              isFolder ? true : !selected,
                            ),
                          )
                        }
                      >
                        <span {...stylex.props(styles.optionIcon)}>
                          {selected && !isFolder ? (
                            <Icons.tick size={15} />
                          ) : isFolder ? (
                            <FolderMark
                              seed={collection.id}
                              color={collection.color}
                              icon={collection.icon}
                              size="compact"
                            />
                          ) : (
                            <Icons.tag size={15} />
                          )}
                        </span>
                        <span {...stylex.props(styles.optionLabel)}>
                          {collection.name}
                        </span>
                        {isFolder && selected ? (
                          <Menu.Trailing>Current</Menu.Trailing>
                        ) : null}
                      </Menu.Item>
                    );
                  })}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ) : null}
        <Menu.Root>
          <Menu.Trigger
            render={
              <IconButton
                type="button"
                aria-label="More conversation actions"
              />
            }
          >
            <Icons.more size={15} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end">
              <Menu.Popup>
                {canMarkUnread ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(onMarkUnread)}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.unreadMail size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>Mark as unread</span>
                  </Menu.Item>
                ) : null}
                {canStar ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(() => onStar(!starred))}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.star size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>
                      {starred ? "Remove star" : "Add star"}
                    </span>
                  </Menu.Item>
                ) : null}
                {canArchive && folder !== "archived" ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(onArchive)}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.archived size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>Archive</span>
                  </Menu.Item>
                ) : null}
                {folder === "spam" || folder === "trash" ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(() => onMove("inbox"))}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.inbox size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>Move to inbox</span>
                  </Menu.Item>
                ) : null}
                {canSpam && folder !== "spam" ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(() => onMove("spam"))}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.spam size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>Mark as spam</span>
                  </Menu.Item>
                ) : null}
                {canTrash && folder !== "trash" ? (
                  <Menu.Item
                    disabled={acting}
                    onClick={() => void runAction(() => onMove("trash"))}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <Icons.trash size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>Move to trash</span>
                  </Menu.Item>
                ) : null}
                <Menu.Item
                  onClick={() => onMode("replyAll")}
                  {...stylex.props(styles.compactMenuItem)}
                >
                  <span {...stylex.props(styles.optionIcon)}>
                    <Icons.replyAll size={15} />
                  </span>
                  <span {...stylex.props(styles.optionLabel)}>Reply all</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() => onMode("forward")}
                  {...stylex.props(styles.compactMenuItem)}
                >
                  <span {...stylex.props(styles.optionIcon)}>
                    <Icons.forward size={15} />
                  </span>
                  <span {...stylex.props(styles.optionLabel)}>Forward</span>
                </Menu.Item>
                <Menu.Item onClick={() => void copyLink()}>
                  <span {...stylex.props(styles.optionIcon)}>
                    <Icons.copyLink size={15} />
                  </span>
                  <span {...stylex.props(styles.optionLabel)}>Copy conversation link</span>
                </Menu.Item>
                <Menu.Item onClick={() => window.print()}>
                  <span {...stylex.props(styles.optionIcon)}>
                    <Icons.print size={15} />
                  </span>
                  <span {...stylex.props(styles.optionLabel)}>Print conversation</span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <span {...stylex.props(styles.count)}>{countLabel}</span>
      <div {...stylex.props(styles.group)}>
        <IconButton
          type="button"
          aria-label="Previous conversation"
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          <Icons.previous size={15} />
        </IconButton>
        <IconButton
          type="button"
          aria-label="Next conversation"
          disabled={!hasNext}
          onClick={onNext}
        >
          <Icons.next size={15} />
        </IconButton>
      </div>
    </div>
  );
}
