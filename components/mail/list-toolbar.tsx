"use client";

import { useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { CollectionActions } from "@/components/mail/collection-actions";
import { FolderMark } from "@/components/mail/folder-mark";
import { SelectionCheckbox } from "@/components/mail/selection-checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import {
  toggleAllThreadSelection,
  type ThreadBulkAction,
  type ThreadSelectionTargets,
} from "@/lib/mail/thread-selection";
import { collectionViewId } from "@/lib/mail/routes";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import type {
  MailAccount,
  MailCollection,
  MailViewId,
  ThreadListQuery,
} from "@/lib/mail/types";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: space[1],
    minWidth: 0,
    flex: 1,
  },
  selectionGroup: {
    display: "inline-flex",
    alignItems: "center",
    height: 32,
    marginInlineStart: -8,
    flexShrink: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
  },
  selectionGroupActive: {
    backgroundColor: colors.surfaceActive,
  },
  selectionToggle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    cursor: "pointer",
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover },
    },
  },
  selectionToggleDisabled: {
    cursor: "not-allowed",
  },
  selectionMenuButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 32,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    ":disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
    "@media (hover: hover)": {
      ":hover:not(:disabled)": {
        backgroundColor: colors.surfaceHover,
        color: colors.text,
      },
    },
  },
  bulkActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[1],
    minWidth: 0,
    flexShrink: 0,
  },
  field: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    width: 280,
    maxWidth: "100%",
    "@media (max-width: 640px)": {
      width: "auto",
      minWidth: 0,
      flex: 1,
    },
  },
  searchIcon: {
    position: "absolute",
    insetInlineStart: 9,
    display: "inline-flex",
    color: colors.textFaint,
    pointerEvents: "none",
  },
  search: {
    width: "100%",
    minWidth: 0,
    height: 32,
    appearance: "none",
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingInlineStart: 31,
    paddingInlineEnd: 34,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    color: colors.text,
    backgroundColor: colors.surfaceActive,
    "::placeholder": { color: colors.textFaint },
    "::-webkit-search-decoration": { appearance: "none" },
    "::-webkit-search-cancel-button": { appearance: "none" },
    "@media (max-width: 640px)": {
      fontSize: "16px",
    },
  },
  closeSearch: {
    position: "absolute",
    insetInlineEnd: 0,
  },
  spacer: {
    flex: 1,
    minWidth: 0,
  },
  spacerSearch: {
    "@media (max-width: 640px)": {
      display: "none",
    },
  },
  menuButton: {
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
  menuButtonActive: {
    backgroundColor: colors.surfaceActive,
    color: colors.text,
  },
  menuButtonLabel: {
    whiteSpace: "nowrap",
    "@media (max-width: 760px)": {
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
  optionCheck: {
    display: "inline-flex",
    marginInlineStart: "auto",
    color: colors.textMuted,
  },
});

const filterLabel = (query: ThreadListQuery) => {
  if (query.unread) return "Unread";
  if (query.hasAttachment) return "With files";
  return "All mail";
};

const sortLabel = (query: ThreadListQuery) => {
  if (query.sort === "from") return "Sender";
  if (query.sort === "subject") return "Subject";
  return query.order === "asc" ? "Oldest" : "Newest";
};

const filterOptions = [
  {
    label: "All mail",
    icon: Icons.allMail,
    selected: (query: ThreadListQuery) => !query.unread && !query.hasAttachment,
    patch: { unread: false, hasAttachment: false },
  },
  {
    label: "Unread",
    icon: Icons.unreadMail,
    selected: (query: ThreadListQuery) => Boolean(query.unread),
    patch: { unread: true, hasAttachment: false },
  },
  {
    label: "With files",
    icon: Icons.attach,
    selected: (query: ThreadListQuery) => Boolean(query.hasAttachment),
    patch: { unread: false, hasAttachment: true },
  },
] as const;

const sortOptions = [
  {
    label: "Newest",
    icon: Icons.newest,
    selected: (query: ThreadListQuery) =>
      (query.sort ?? "date") === "date" && query.order !== "asc",
    patch: { sort: "date", order: "desc" },
  },
  {
    label: "Oldest",
    icon: Icons.oldest,
    selected: (query: ThreadListQuery) =>
      (query.sort ?? "date") === "date" && query.order === "asc",
    patch: { sort: "date", order: "asc" },
  },
  {
    label: "Sender",
    icon: Icons.sender,
    selected: (query: ThreadListQuery) => query.sort === "from",
    patch: { sort: "from", order: "asc" },
  },
  {
    label: "Subject",
    icon: Icons.subject,
    selected: (query: ThreadListQuery) => query.sort === "subject",
    patch: { sort: "subject", order: "asc" },
  },
] as const;

export function ListToolbar({
  query,
  onSearch,
  onQuery,
  supportsSort = true,
  account,
  folder,
  collections,
  collection,
  selectionTargets,
  selectedThreadIds,
  bulkActing,
  bulkActionStatus,
  onBulkAction,
  onSelectionChange,
}: {
  query: ThreadListQuery;
  onSearch: (value: string) => void;
  onQuery: (patch: Partial<ThreadListQuery>) => void;
  supportsSort?: boolean;
  account: MailAccount;
  folder: MailViewId;
  collections: MailCollection[];
  collection?: MailCollection;
  selectionTargets: ThreadSelectionTargets;
  selectedThreadIds: ReadonlySet<string>;
  bulkActing: boolean;
  bulkActionStatus: string;
  onBulkAction: (action: ThreadBulkAction) => void;
  onSelectionChange: (selectedIds: Set<string>) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(query.q));
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const showSearch = searchOpen || Boolean(query.q);
  const currentFilter = filterLabel(query);
  const currentSort = sortLabel(query);
  const selectableCount = selectionTargets.allIds.length;
  const selectedCount = selectionTargets.allIds.reduce(
    (count, id) => count + Number(selectedThreadIds.has(id)),
    0,
  );
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;
  const partlySelected = selectedCount > 0 && !allSelected;
  const selectedThreads = selectionTargets.items.filter((thread) =>
    selectedThreadIds.has(thread.id),
  );
  const anyUnread = selectedThreads.some((thread) => thread.unread);
  const allStarred =
    selectedThreads.length > 0 &&
    selectedThreads.every((thread) => thread.favorite);
  const canMarkUnread = account.capabilities.includes("markUnread");
  const canStar = account.capabilities.includes("star");
  const canArchive =
    account.capabilities.includes("archive") && folder !== "archived";
  const canSpam = account.capabilities.includes("spam") && folder !== "spam";
  const canTrash =
    account.capabilities.includes("trash") && folder !== "trash";
  const canMoveInbox = folder === "spam" || folder === "trash";
  const showMoreActions = canStar || canMoveInbox || canSpam || canTrash;
  const searchVisible = selectedCount === 0 && showSearch;

  const openSearch = () => {
    setSearchOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearch = () => {
    onSearch("");
    setSearchOpen(false);
    window.requestAnimationFrame(() => searchButtonRef.current?.focus());
  };

  return (
    <div {...stylex.props(styles.root)}>
      <span className="sr-only" role="status" aria-live="polite">
        {bulkActionStatus}
      </span>
      <div
        {...stylex.props(
          styles.selectionGroup,
          selectedCount > 0 && styles.selectionGroupActive,
        )}
      >
        <label
          {...stylex.props(
            styles.selectionToggle,
            selectableCount === 0 && styles.selectionToggleDisabled,
          )}
        >
          <SelectionCheckbox
            checked={allSelected}
            indeterminate={partlySelected}
            disabled={selectableCount === 0}
            aria-label={
              allSelected
                ? "Deselect all conversations"
                : "Select all conversations"
            }
            onClick={() =>
              onSelectionChange(
                toggleAllThreadSelection(
                  selectionTargets.allIds,
                  selectedThreadIds,
                ),
              )
            }
          />
        </label>
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                disabled={selectableCount === 0}
                aria-label="Choose conversations to select"
                {...stylex.props(styles.selectionMenuButton)}
              />
            }
          >
            <Icons.chevronDown size={12} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="start">
              <Menu.Popup>
                <SelectionOption
                  label="All"
                  icon={Icons.allMail}
                  ids={selectionTargets.allIds}
                  selectedCount={selectedCount}
                  selectedThreadIds={selectedThreadIds}
                  onSelectionChange={onSelectionChange}
                />
                <SelectionOption
                  label="None"
                  icon={Icons.close}
                  ids={[]}
                  selectedCount={selectedCount}
                  selectedThreadIds={selectedThreadIds}
                  onSelectionChange={onSelectionChange}
                />
                <Menu.Separator />
                <SelectionOption
                  label="Unread"
                  icon={Icons.unreadMail}
                  ids={selectionTargets.unreadIds}
                  selectedCount={selectedCount}
                  selectedThreadIds={selectedThreadIds}
                  onSelectionChange={onSelectionChange}
                />
                <SelectionOption
                  label="Starred"
                  icon={Icons.star}
                  ids={selectionTargets.starredIds}
                  selectedCount={selectedCount}
                  selectedThreadIds={selectedThreadIds}
                  onSelectionChange={onSelectionChange}
                />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      {selectedCount > 0 ? (
        <div
          role="toolbar"
          aria-label={`Actions for ${selectedCount} selected ${selectedCount === 1 ? "conversation" : "conversations"}`}
          {...stylex.props(styles.bulkActions)}
        >
          {canMarkUnread ? (
            <IconButton
              type="button"
              disabled={bulkActing}
              aria-label={anyUnread ? "Mark selected as read" : "Mark selected as unread"}
              onClick={() =>
                onBulkAction({ type: "unread", unread: !anyUnread })
              }
            >
              {anyUnread ? (
                <Icons.check size={15} />
              ) : (
                <Icons.unreadMail size={15} />
              )}
            </IconButton>
          ) : null}
          {canArchive ? (
            <IconButton
              type="button"
              disabled={bulkActing}
              aria-label="Archive selected"
              onClick={() => onBulkAction({ type: "archive" })}
            >
              <Icons.archived size={15} />
            </IconButton>
          ) : null}
          {account.capabilities.includes("collections") && collections.length > 0 ? (
            <BulkCollectionMenu
              folder={folder}
              collections={collections}
              selectedThreads={selectedThreads}
              disabled={bulkActing}
              onBulkAction={onBulkAction}
            />
          ) : null}
          {showMoreActions ? (
            <Menu.Root>
              <Menu.Trigger
                render={
                  <IconButton
                    type="button"
                    disabled={bulkActing}
                    aria-label="More actions for selected conversations"
                  />
                }
              >
                <Icons.more size={15} />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup>
                    {canStar ? (
                      <Menu.Item
                        onClick={() =>
                          onBulkAction({
                            type: "starred",
                            starred: !allStarred,
                          })
                        }
                      >
                        <Menu.Icon><Icons.star size={16} /></Menu.Icon>
                        <Menu.Label>
                          {allStarred ? "Remove stars" : "Add stars"}
                        </Menu.Label>
                      </Menu.Item>
                    ) : null}
                    {canMoveInbox ? (
                      <Menu.Item
                        onClick={() =>
                          onBulkAction({ type: "move", destination: "inbox" })
                        }
                      >
                        <Menu.Icon><Icons.inbox size={16} /></Menu.Icon>
                        <Menu.Label>Move to inbox</Menu.Label>
                      </Menu.Item>
                    ) : null}
                    {canSpam ? (
                      <Menu.Item
                        onClick={() =>
                          onBulkAction({ type: "move", destination: "spam" })
                        }
                      >
                        <Menu.Icon><Icons.spam size={16} /></Menu.Icon>
                        <Menu.Label>Mark as spam</Menu.Label>
                      </Menu.Item>
                    ) : null}
                    {canTrash ? (
                      <Menu.Item
                        onClick={() =>
                          onBulkAction({ type: "move", destination: "trash" })
                        }
                      >
                        <Menu.Icon><Icons.trash size={16} /></Menu.Icon>
                        <Menu.Label>Move to trash</Menu.Label>
                      </Menu.Item>
                    ) : null}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : null}
        </div>
      ) : showSearch ? (
        <div {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.searchIcon)}>
            <Icons.search size={15} />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query.q ?? ""}
            placeholder="Search this folder"
            aria-label="Search this folder"
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              }
            }}
            {...stylex.props(styles.search)}
          />
          <IconButton
            type="button"
            aria-label={query.q ? "Clear and close search" : "Close search"}
            static
            onClick={closeSearch}
            {...stylex.props(styles.closeSearch)}
          >
            <Icons.close size={14} />
          </IconButton>
        </div>
      ) : (
        <IconButton
          ref={searchButtonRef}
          type="button"
          aria-label="Search this folder"
          onClick={openSearch}
        >
          <Icons.search size={15} />
        </IconButton>
      )}
      <span
        {...stylex.props(
          styles.spacer,
          searchVisible && styles.spacerSearch,
        )}
      />
      <Menu.Root>
        <Menu.Trigger
          render={
            <button
              type="button"
              aria-label={`Filter messages: ${currentFilter}`}
              {...stylex.props(
                styles.menuButton,
                currentFilter !== "All mail" && styles.menuButtonActive,
              )}
            />
          }
        >
          <Icons.filter size={15} />
          <span {...stylex.props(styles.menuButtonLabel)}>{currentFilter}</span>
          <Icons.chevronDown size={13} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end">
            <Menu.Popup>
              {filterOptions.map((option) => {
                const OptionIcon = option.icon;
                const selected = option.selected(query);
                return (
                  <Menu.Item
                    key={option.label}
                    onClick={() => onQuery({ ...option.patch, offset: 0 })}
                  >
                    <span {...stylex.props(styles.optionIcon)}>
                      <OptionIcon size={15} />
                    </span>
                    <span {...stylex.props(styles.optionLabel)}>{option.label}</span>
                    {selected ? (
                      <span {...stylex.props(styles.optionCheck)}>
                        <Icons.check size={14} />
                      </span>
                    ) : null}
                  </Menu.Item>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {supportsSort ? (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                aria-label={`Sort messages: ${currentSort}`}
                {...stylex.props(styles.menuButton)}
              />
            }
          >
            <Icons.sort size={15} />
            <span {...stylex.props(styles.menuButtonLabel)}>{currentSort}</span>
            <Icons.chevronDown size={13} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end">
              <Menu.Popup>
                {sortOptions.map((option) => {
                  const OptionIcon = option.icon;
                  const selected = option.selected(query);
                  return (
                    <Menu.Item
                      key={option.label}
                      onClick={() => onQuery({ ...option.patch, offset: 0 })}
                    >
                      <span {...stylex.props(styles.optionIcon)}>
                        <OptionIcon size={15} />
                      </span>
                      <span {...stylex.props(styles.optionLabel)}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span {...stylex.props(styles.optionCheck)}>
                          <Icons.check size={14} />
                        </span>
                      ) : null}
                    </Menu.Item>
                  );
                })}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : null}
      {collection && selectedCount === 0 ? (
        <CollectionActions accountId={account.id} collection={collection} />
      ) : null}
    </div>
  );
}

function BulkCollectionMenu({
  folder,
  collections,
  selectedThreads,
  disabled,
  onBulkAction,
}: {
  folder: MailViewId;
  collections: MailCollection[];
  selectedThreads: ThreadSelectionTargets["items"];
  disabled: boolean;
  onBulkAction: (action: ThreadBulkAction) => void;
}) {
  const labelsOnly = collections.every((item) => item.kind === "label");

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton
            type="button"
            disabled={disabled}
            aria-label={labelsOnly ? "Manage labels" : "Move to folder"}
          />
        }
      >
        {labelsOnly ? (
          <Icons.tag size={15} />
        ) : (
          <FolderMark tone="neutral" size="compact" />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start">
          <Menu.Popup>
            {collections.map((item) => {
              const active = folder === collectionViewId(item.id);
              const selectedForAll = selectedThreads.every((thread) =>
                thread.collectionIds?.includes(item.id),
              );
              const nextSelected =
                item.kind === "folder" ? true : !selectedForAll;
              const label =
                item.kind === "folder"
                  ? `Move to ${item.name}`
                  : selectedForAll
                    ? `Remove ${item.name}`
                    : `Add ${item.name}`;
              return (
                <Menu.Item
                  key={item.id}
                  disabled={item.kind === "folder" && active}
                  onClick={() =>
                    onBulkAction({
                      type: "collection",
                      collectionId: item.id,
                      selected: nextSelected,
                      removeFromList:
                        item.kind === "folder" || (!nextSelected && active),
                    })
                  }
                >
                  <Menu.Icon>
                    {item.kind === "folder" ? (
                      <FolderMark
                        seed={item.id}
                        color={item.color}
                        icon={item.icon}
                        size="compact"
                      />
                    ) : (
                      <Icons.tag size={15} />
                    )}
                  </Menu.Icon>
                  <Menu.Label>{label}</Menu.Label>
                  {selectedForAll || active ? (
                    <Menu.Trailing>
                      <Icons.check size={14} />
                    </Menu.Trailing>
                  ) : null}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function SelectionOption({
  label,
  icon: OptionIcon,
  ids,
  selectedCount,
  selectedThreadIds,
  onSelectionChange,
}: {
  label: string;
  icon: typeof Icons.allMail;
  ids: readonly string[];
  selectedCount: number;
  selectedThreadIds: ReadonlySet<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}) {
  const disabled = label !== "None" && ids.length === 0;
  const selected =
    label === "None"
      ? selectedCount === 0
      : ids.length === selectedCount && ids.every((id) => selectedThreadIds.has(id));

  return (
    <Menu.Item
      disabled={disabled}
      onClick={() => onSelectionChange(new Set(ids))}
    >
      <span {...stylex.props(styles.optionIcon)}>
        <OptionIcon size={15} />
      </span>
      <span {...stylex.props(styles.optionLabel)}>{label}</span>
      {selected ? (
        <span {...stylex.props(styles.optionCheck)}>
          <Icons.check size={14} />
        </span>
      ) : null}
    </Menu.Item>
  );
}
