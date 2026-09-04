"use client";

import Link from "next/link";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  AccountSessionMenuGroup,
  AccountSignOutMenuItem,
} from "@/components/auth/account-sessions";
import { CreateCollectionDialog } from "@/components/mail/create-collection-dialog";
import { FolderMark } from "@/components/mail/folder-mark";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import type { FolderCounts } from "@/lib/mail/folder-counts";
import {
  collectionViewId,
  mailFolderHref,
  mailSettingsHref,
} from "@/lib/mail/routes";
import type { MailAccount, MailCollection } from "@/lib/mail/types";
import { colors } from "@/theme/tokens.stylex";
import { mailFoldersForAccount } from "./sidebar";

const styles = stylex.create({
  root: {
    display: "none",
    "@media (max-width: 640px)": {
      display: "inline-flex",
      /* Shares the tab strip's baseline, so it keeps the same clearance the
         inactive tabs do rather than running into the pane. */
      marginBlockEnd: 4,
    },
  },
  current: {
    display: "inline-flex",
    color: colors.textMuted,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  count: {
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
});

export function MobileNav({
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
  const [createOpen, setCreateOpen] = useState(false);
  const collectionKind = "folder" as const;
  return (
    <>
      <div {...stylex.props(styles.root)}>
        <Menu.Root>
          <Menu.Trigger
            render={<IconButton type="button" aria-label="Mail menu" />}
          >
            <Icons.inbox size={15} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="start">
              <Menu.Popup>
                <Menu.Item onClick={onCompose}>
                  <Menu.Icon>
                    <Icons.compose size={16} />
                  </Menu.Icon>
                  <Menu.Label>New email</Menu.Label>
                </Menu.Item>
                <Menu.Separator />
                {mailFoldersForAccount(account).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Menu.Item
                      key={item.id}
                      aria-current={folder === item.id ? "true" : undefined}
                      render={
                        <Link
                          href={mailFolderHref(item.id, undefined, account.id)}
                        />
                      }
                    >
                      <Icon size={14} />
                      <span {...stylex.props(styles.label)}>{item.label}</span>
                      {folderCounts[item.id] ? (
                        <span {...stylex.props(styles.count)}>
                          {folderCounts[item.id]}
                        </span>
                      ) : null}
                      {folder === item.id ? (
                        <span {...stylex.props(styles.current)}>
                          <Icons.check size={14} />
                        </span>
                      ) : null}
                    </Menu.Item>
                  );
                })}
                <Menu.Separator />
                {collections.map((collection) => {
                  const view = collectionViewId(collection.id);
                  return (
                    <Menu.Item
                      key={collection.id}
                      aria-current={folder === view ? "true" : undefined}
                      render={
                        <Link
                          href={mailFolderHref(view, undefined, account.id)}
                        />
                      }
                    >
                      {collection.kind === "label" ? (
                        <Icons.tag size={14} />
                      ) : (
                        <FolderMark
                          seed={collection.id}
                          color={collection.color}
                          icon={collection.icon}
                          size="compact"
                        />
                      )}
                      <span {...stylex.props(styles.label)}>
                        {collection.name}
                      </span>
                      {collection.unread ? (
                        <span {...stylex.props(styles.count)}>
                          {collection.unread}
                        </span>
                      ) : null}
                      {folder === view ? (
                        <span {...stylex.props(styles.current)}>
                          <Icons.check size={14} />
                        </span>
                      ) : null}
                    </Menu.Item>
                  );
                })}
                <Menu.Item onClick={() => setCreateOpen(true)}>
                  <Menu.Icon>
                    <Icons.add size={16} />
                  </Menu.Icon>
                  <Menu.Label>Create {collectionKind}</Menu.Label>
                </Menu.Item>
                <Menu.Separator />
                <AccountSessionMenuGroup />
                <Menu.Separator />
                <Menu.Item
                  render={<Link href={mailSettingsHref("account")} />}
                >
                  <Menu.Icon>
                    <Icons.settings size={16} />
                  </Menu.Icon>
                  <Menu.Label>Settings</Menu.Label>
                </Menu.Item>
                <Menu.Separator />
                <AccountSignOutMenuItem onSignOut={onSignOut} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <CreateCollectionDialog
        accountId={account.id}
        kind={collectionKind}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
