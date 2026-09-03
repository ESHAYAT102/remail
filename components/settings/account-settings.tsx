"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useMailShell } from "@/components/shell/app-shell";
import {
  SettingsActionRow,
  SettingsActions,
  SettingsCard,
  SettingsField,
  SettingsPage,
  SettingsStatus,
  settingsControlClass,
  settingsFormClass,
} from "./settings-ui";
import type { SessionUser } from "@/lib/session";
import {
  accountDeletionFallback,
  requestAccountDeletion,
} from "@/lib/account-deletion";
import { colors, fonts, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  dialogForm: {
    display: "flex",
    flexDirection: "column",
  },
  dialogField: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  dialogLabel: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  dialogStatus: {
    marginBlockStart: space[3],
  },
  dialogActions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[2],
    marginBlockStart: space[4],
  },
});

export function AccountSettings() {
  const router = useRouter();
  const { sessionUser, updateUser } = useMailShell();
  const [name, setName] = useState(sessionUser.name);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: "", error: false });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);

  function changeDeleteOpen(open: boolean) {
    if (deleteBusy) return;
    setDeleteOpen(open);
    if (!open) {
      setDeleteStatus("");
    }
  }

  return (
    <SettingsPage
      title="Account"
      description="Manage your Remail profile."
    >
      <SettingsCard title="Profile">
        <form
          className={settingsFormClass.className}
          style={settingsFormClass.style}
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              setStatus({ message: "Enter a display name.", error: true });
              return;
            }
            setSaving(true);
            setStatus({ message: "Saving…", error: false });
            const response = await fetch("/api/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: trimmed }),
            }).catch(() => null);
            const json = response
              ? ((await response.json()) as { user?: SessionUser; error?: string })
              : null;
            if (!response?.ok || !json?.user) {
              setSaving(false);
              setStatus({
                message:
                  json?.error ??
                  "Unable to save changes. Check your connection and try again.",
                error: true,
              });
              return;
            }
            setName(json.user.name);
            updateUser(json.user);
            setSaving(false);
            setStatus({ message: "Profile saved.", error: false });
          }}
        >
          <SettingsField label="Display name" htmlFor="account-name">
            <input
              id="account-name"
              name="name"
              value={name}
              required
              placeholder="Ada Lovelace"
              autoComplete="name"
              aria-invalid={status.error || undefined}
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
              className={settingsControlClass.className}
              style={settingsControlClass.style}
            />
          </SettingsField>
          <SettingsField
            label="Email address"
            htmlFor="account-email"
            hint="Used to sign in to Remail. This address can’t be changed."
          >
            <input
              id="account-email"
              value={sessionUser.email}
              readOnly
              autoComplete="email"
              className={settingsControlClass.className}
              style={settingsControlClass.style}
            />
          </SettingsField>
          <SettingsActions>
            <SettingsStatus message={status.message} error={status.error} />
            <Button
              type="submit"
              disabled={saving || name.trim() === sessionUser.name}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </SettingsActions>
        </form>
      </SettingsCard>
      <Dialog.Root open={deleteOpen} onOpenChange={changeDeleteOpen}>
        <SettingsCard title="Delete account">
          <SettingsActionRow
            label="Delete account"
            description="Permanently remove your account, messages, domains, and settings."
          >
            <Dialog.Trigger render={<Button variant="danger">Delete account</Button>} />
          </SettingsActionRow>
        </SettingsCard>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup initialFocus={passwordRef}>
            <form
              {...stylex.props(styles.dialogForm)}
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const password = String(form.get("password") ?? "");
                setDeleteBusy(true);
                setDeleteStatus("");
                let deletionSucceeded = false;
                try {
                  const result = await requestAccountDeletion(password);
                  if (!result.ok) {
                    setDeleteStatus(result.error);
                    return;
                  }
                  deletionSucceeded = true;
                  router.replace("/");
                  router.refresh();
                } catch {
                  setDeleteStatus(accountDeletionFallback);
                } finally {
                  if (!deletionSucceeded) {
                    setDeleteBusy(false);
                    requestAnimationFrame(() => {
                      passwordRef.current?.focus();
                      passwordRef.current?.select();
                    });
                  }
                }
              }}
            >
              <Dialog.Title>Delete account?</Dialog.Title>
              <Dialog.Description>
                This permanently deletes your Remail account, messages, custom domains,
                and settings. This can’t be undone.
              </Dialog.Description>
              <div {...stylex.props(styles.dialogField)}>
                <label htmlFor="delete-account-password" {...stylex.props(styles.dialogLabel)}>
                  Password
                </label>
                <input
                  ref={passwordRef}
                  id="delete-account-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={deleteBusy}
                  aria-invalid={Boolean(deleteStatus) || undefined}
                  aria-describedby={deleteStatus ? "delete-account-error" : undefined}
                  className={settingsControlClass.className}
                  style={settingsControlClass.style}
                />
              </div>
              <div {...stylex.props(styles.dialogStatus)}>
                <SettingsStatus
                  id="delete-account-error"
                  message={deleteStatus}
                  error={Boolean(deleteStatus)}
                />
              </div>
              <div {...stylex.props(styles.dialogActions)}>
                <Dialog.Close
                  render={
                    <Button type="button" variant="ghost" disabled={deleteBusy}>
                      Cancel
                    </Button>
                  }
                />
                <Button type="submit" variant="danger" disabled={deleteBusy}>
                  {deleteBusy ? "Deleting…" : "Delete account"}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </SettingsPage>
  );
}
