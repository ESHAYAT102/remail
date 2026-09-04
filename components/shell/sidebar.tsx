"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import * as stylex from "@stylexjs/stylex";
import {
  AccountSessionMenuGroup,
  AccountSignOutMenuItem,
} from "@/components/auth/account-sessions";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import { FolderMark } from "@/components/mail/folder-mark";
import { useThreadDragState } from "@/components/mail/thread-drag";
import { MailAccountIcon } from "@/components/mail/mail-account-icon";
import { CreateCollectionDialog } from "@/components/mail/create-collection-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { NavItem } from "@/components/ui/nav-item";
import { Menu } from "@/components/ui/menu";
import type { MailAccount, MailCollection } from "@/lib/mail/types";
import type { FolderCounts } from "@/lib/mail/folder-counts";
import {
  threadDropTargetKey,
  type ThreadDropTarget,
} from "@/lib/mail/thread-drag";
import {
  mailFolderHref,
  mailSettingsHref,
  collectionViewId,
  type MailFolderId,
} from "@/lib/mail/routes";

const styles = stylex.create({
  root: {
    width: 216,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    paddingBlock: space[2],
    paddingInline: space[2],
    gap: space[4],
    "@media (max-width: 640px)": {
      display: "none",
    },
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: space[1],
    minHeight: 32,
    paddingInline: 2,
  },
  account: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
  },
  accountEmail: {
    maxWidth: 132,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  accountItem: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  compose: {
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
  },
  nav: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: space[4],
    minHeight: 0,
    overflow: "auto",
    /* The scroll box would otherwise clip the ring and lift off each item's
       left and right edges. Padding gives them room; the margin gives it back. */
    paddingInline: 4,
    marginInline: -4,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
  },
  groupTrigger: {
    display: "flex",
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: space[2],
    minHeight: 28,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textFaint,
    fontFamily: "inherit",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    letterSpacing: fonts.captionTrack,
    fontWeight: 500,
    paddingBlock: space[1],
    paddingInline: 10,
    cursor: "pointer",
    textAlign: "start",
    borderRadius: radius.sm,
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.textMuted },
    },
  },
  groupAction: {
    width: 28,
    height: 28,
    color: colors.textFaint,
  },
  groupChevron: {
    display: "inline-flex",
    transform: "rotate(-90deg)",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  groupChevronOpen: {
    transform: "rotate(0deg)",
  },
  groupLabel: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    letterSpacing: fonts.captionTrack,
    fontWeight: 500,
  },
});

export const mailFolders: Array<{
  id: MailFolderId;
  label: string;
  icon: (typeof Icons)[keyof typeof Icons];
}> = [
  { id: "inbox", label: "Inbox", icon: Icons.inbox },
  { id: "starred", label: "Starred", icon: Icons.star },
  { id: "sent", label: "Sent", icon: Icons.sent },
  { id: "drafts", label: "Drafts", icon: Icons.drafts },
  { id: "spam", label: "Spam", icon: Icons.spam },
  { id: "trash", label: "Trash", icon: Icons.trash },
  { id: "archived", label: "Archived", icon: Icons.archived },
];

export function mailFoldersForAccount(account: MailAccount) {
  return mailFolders.filter((folder) => {
    if (folder.id === "starred") return account.capabilities.includes("star");
    if (folder.id === "drafts") return account.capabilities.includes("drafts");
    if (folder.id === "spam") return account.capabilities.includes("spam");
    if (folder.id === "trash") return account.capabilities.includes("trash");
    return true;
  });
}

function SidebarDropNavItem({
  dropTarget,
  enabled = true,
  ...props
}: React.ComponentProps<typeof NavItem> & {
  dropTarget?: ThreadDropTarget | null;
  enabled?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const { dragging, overTargetKey } = useThreadDragState();
  const targetKey = dropTarget ? threadDropTargetKey(dropTarget) : null;
  const available = dragging && enabled && Boolean(targetKey);
  const active = available && overTargetKey === targetKey;

  return (
    <motion.div
      data-mail-drop-target={available ? targetKey : undefined}
      animate={{ scale: active ? 1.025 : 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 560, damping: 27, mass: 0.65 }
      }
    >
      <NavItem
        {...props}
        dropAvailable={available}
        dropActive={active}
      />
    </motion.div>
  );
}

function systemDropTarget(
  destination: MailFolderId,
  account: MailAccount,
  currentFolder: string,
): ThreadDropTarget | null {
  if (
    destination === "archived" &&
    currentFolder !== "archived" &&
    account.capabilities.includes("archive")
  ) {
    return { type: "archive" };
  }
  if (
    destination === "inbox" &&
    currentFolder !== "inbox" &&
    currentFolder !== "smart"
  ) {
    return { type: "move", destination: "inbox" };
  }
  if (
    destination === "smart" &&
    currentFolder !== "smart" &&
    account.capabilities.includes("markUnread")
  ) {
    return { type: "unread" };
  }
  if (
    destination === "spam" &&
    currentFolder !== "spam" &&
    account.capabilities.includes("spam")
  ) {
    return { type: "move", destination: "spam" };
  }
  if (
    destination === "trash" &&
    currentFolder !== "trash" &&
    account.capabilities.includes("trash")
  ) {
    return { type: "move", destination: "trash" };
  }
  return null;
}

function NavGroup({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const trigger = stylex.props(styles.groupTrigger);
  const panel = stylex.props(styles.panel);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div {...stylex.props(styles.groupHeader)}>
        <Collapsible.Trigger className={trigger.className} style={trigger.style}>
          <span
            {...stylex.props(
              styles.groupChevron,
              open && styles.groupChevronOpen,
            )}
          >
            <Icons.chevronDown size={13} />
          </span>
          <span {...stylex.props(styles.groupLabel)}>{title}</span>
        </Collapsible.Trigger>
        {action}
      </div>
      <Collapsible.Panel className={panel.className} style={panel.style}>
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export function Sidebar({
  account,
  folder,
  folderCounts,
  collections,
  onCompose,
  onSignOut,
}: {
  account: MailAccount;
  folder: string;
  folderCounts: FolderCounts;
  collections: MailCollection[];
  onCompose: () => void;
  onSignOut: () => void;
}) {
  const composeSx = stylex.props(styles.compose);
  const [createOpen, setCreateOpen] = useState(false);
  const collectionKind = "folder" as const;
  const collectionTitle = "Folders";
  const identity = account.email.split("@").at(-1) ?? account.email;

  useEffect(() => {
    const openCreateFolder = () => setCreateOpen(true);
    window.addEventListener("redakt:create-folder", openCreateFolder);
    return () =>
      window.removeEventListener("redakt:create-folder", openCreateFolder);
  }, []);

  return (
    <>
      <aside {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.identity)}>
          <Menu.Root>
            <Menu.Trigger
              render={
                <button
                  type="button"
                  aria-label={`Domain inbox, ${identity}`}
                  {...stylex.props(styles.account)}
                >
                  <MailAccountIcon connector={account.connector} />
                  <span {...stylex.props(styles.accountEmail)}>
                    {identity}
                  </span>
                  <Icons.chevronDown size={13} />
                </button>
              }
            />
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="start">
                <Menu.Popup>
                  <AccountSessionMenuGroup />
                  <Menu.Separator />
                  <Menu.Item
                    render={<Link href={mailSettingsHref("account")} />}
                  >
                    <Menu.Icon><Icons.settings size={16} /></Menu.Icon>
                    <Menu.Label>Settings</Menu.Label>
                  </Menu.Item>
                  <Menu.Separator />
                  <AccountSignOutMenuItem onSignOut={onSignOut} />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>

        <Button
          variant="pillAccent"
          onClick={onCompose}
          className={composeSx.className}
          style={composeSx.style}
        >
          <Icons.add size={15} />
          New email
        </Button>
      </div>

      <div {...stylex.props(styles.nav)}>
        <NavGroup title="Emails">
          {mailFoldersForAccount(account).map((item) => {
            const Icon = item.icon;
            return (
              <SidebarDropNavItem
                key={item.id}
                label={item.label}
                icon={<Icon size={15} />}
                meta={folderCounts[item.id] || undefined}
                active={folder === item.id}
                href={mailFolderHref(item.id, undefined, account.id)}
                dropTarget={systemDropTarget(item.id, account, folder)}
              />
            );
          })}
        </NavGroup>
        <NavGroup
          title={collectionTitle}
          action={
            <IconButton
              type="button"
              aria-label={`Create ${collectionKind}`}
              title={`Create ${collectionKind}`}
              onClick={() => setCreateOpen(true)}
              {...stylex.props(styles.groupAction)}
            >
              <Icons.add size={14} />
            </IconButton>
          }
        >
          {collections.map((collection) => {
            const view = collectionViewId(collection.id);
            return (
              <SidebarDropNavItem
                key={collection.id}
                label={collection.name}
                icon={
                  collection.kind === "label" ? (
                    <Icons.tag size={15} />
                  ) : (
                    <FolderMark
                      seed={collection.id}
                      color={collection.color}
                      icon={collection.icon}
                    />
                  )
                }
                meta={collection.unread || undefined}
                active={folder === view}
                href={mailFolderHref(view, undefined, account.id)}
                dropTarget={{
                  type: "collection",
                  collectionId: collection.id,
                }}
                enabled={folder !== view}
              />
            );
          })}
        </NavGroup>
      </div>
      </aside>
      <CreateCollectionDialog
        accountId={account.id}
        kind={collectionKind}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
