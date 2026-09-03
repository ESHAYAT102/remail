"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { EditCollectionDialog } from "@/components/mail/create-collection-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import { mailFolderHref } from "@/lib/mail/routes";
import type { MailCollection } from "@/lib/mail/types";
import { colors, fonts, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  dangerItem: {
    color: colors.danger,
  },
  status: {
    minHeight: fonts.uiLine,
    marginBlockStart: space[3],
    color: colors.danger,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[2],
    marginBlockStart: space[3],
  },
});

function DeleteCollectionDialog({
  accountId,
  collection,
  open,
  onOpenChange,
}: {
  accountId: string;
  collection: MailCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const term = collection.kind === "label" ? "label" : "folder";

  const changeOpen = (next: boolean) => {
    if (busy) return;
    if (!next) setError("");
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              const response = await fetch(
                `/api/mail/collections/${encodeURIComponent(collection.id)}?account=${encodeURIComponent(accountId)}`,
                { method: "DELETE" },
              ).catch(() => null);
              if (!response?.ok) {
                const result = response
                  ? ((await response.json().catch(() => null)) as {
                      error?: string;
                    } | null)
                  : null;
                setError(
                  result?.error ??
                    `Unable to delete this ${term}. Check your connection and try again.`,
                );
                setBusy(false);
                return;
              }
              setBusy(false);
              setError("");
              onOpenChange(false);
              router.replace(mailFolderHref("inbox", undefined, accountId));
              router.refresh();
            }}
          >
            <Dialog.Title>Delete {term}?</Dialog.Title>
            <Dialog.Description>
              {collection.kind === "label" ? (
                <>
                  Deleting “{collection.name}” removes the label from its
                  conversations. This cannot be undone.
                </>
              ) : (
                <>
                  Conversations in “{collection.name}” will move to Inbox. The
                  folder will then be deleted. This cannot be undone.
                </>
              )}
            </Dialog.Description>
            <p role={error ? "alert" : undefined} {...stylex.props(styles.status)}>
              {error}
            </p>
            <div {...stylex.props(styles.actions)}>
              <Dialog.Close
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" variant="danger" disabled={busy}>
                {busy ? "Deleting…" : `Delete ${term}`}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CollectionActions({
  accountId,
  collection,
}: {
  accountId: string;
  collection: MailCollection;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const term = collection.kind === "label" ? "label" : "folder";

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          render={
            <IconButton type="button" aria-label={`${term} actions`} />
          }
        >
          <Icons.more size={15} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end">
            <Menu.Popup>
              <Menu.Item onClick={() => setEditOpen(true)}>
                <Menu.Icon>
                  <Icons.compose size={15} />
                </Menu.Icon>
                <Menu.Label>Edit {term}</Menu.Label>
              </Menu.Item>
              <Menu.Item
                onClick={() => setDeleteOpen(true)}
                {...stylex.props(styles.dangerItem)}
              >
                <Menu.Icon {...stylex.props(styles.dangerItem)}>
                  <Icons.trash size={15} />
                </Menu.Icon>
                <Menu.Label>Delete {term}</Menu.Label>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <EditCollectionDialog
        accountId={accountId}
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        accountId={accountId}
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
