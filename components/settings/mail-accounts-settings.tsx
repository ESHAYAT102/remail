"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ConnectGmailButton } from "@/components/mail/connect-gmail-button";
import { MailAccountIcon } from "@/components/mail/mail-account-icon";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";
import { Dialog } from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icons";
import { getMailConnectorDefinition } from "@/lib/mail/connectors";
import {
  mailAccountsHref,
  mailFolderHref,
} from "@/lib/mail/routes";
import type { MailAccount } from "@/lib/mail/types";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import { SettingsCard, SettingsRow } from "./settings-ui";

const styles = stylex.create({
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minWidth: 0,
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
  },
  providerName: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 600,
  },
  secondary: {
    margin: 0,
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    overflowWrap: "break-word",
    textWrap: "pretty",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[1],
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    paddingInline: space[3],
    borderRadius: radius.lg,
    color: colors.textMuted,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    textDecoration: "none",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text, backgroundColor: colors.surfaceHover },
    },
    "@media (max-width: 640px)": { minHeight: 44 },
  },
  danger: { color: colors.danger },
  notice: {
    display: "flex",
    alignItems: "flex-start",
    gap: space[2],
  },
  noticeIcon: {
    display: "inline-flex",
    flexShrink: 0,
    marginBlockStart: 1,
    color: colors.textFaint,
  },
  privacy: {
    margin: 0,
    paddingInline: space[5],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    textWrap: "pretty",
    "@media (max-width: 640px)": { paddingInline: space[4] },
  },
  privacyLink: {
    color: colors.accentText,
    fontWeight: 500,
    textDecorationLine: "underline",
    textDecorationThickness: "from-font",
    textUnderlinePosition: "from-font",
    textDecorationSkipInk: "auto",
    "@media (hover: hover)": {
      ":hover": { color: colors.text },
    },
  },
  addTrigger: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    width: "100%",
    minHeight: 52,
    paddingBlock: space[3],
    paddingInline: space[5],
    borderWidth: 0,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    backgroundColor: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    textAlign: "start",
    outline: "none",
    ":active": { transform: "scale(0.96)" },
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.text,
      outlineOffset: -3,
    },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, color, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
    "@media (max-width: 640px)": {
      minHeight: 56,
      paddingInline: space[4],
    },
  },
  addLabel: { flex: 1, minWidth: 0 },
  chevron: {
    display: "inline-flex",
    flexShrink: 0,
    transform: "rotate(-90deg)",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  chevronOpen: { transform: "rotate(0deg)" },
  addPanel: {
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
  },
  dialogActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: space[2],
  },
  error: {
    margin: 0,
    color: colors.danger,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

function accountStatus(account: MailAccount) {
  if (account.status === "reauthorize") return "Reconnect needed";
  if (account.status === "setup") return "Setup needed";
  return "Connected";
}

export function MailAccountsSettings({
  accounts,
  googleEnabled,
  notice,
}: {
  accounts: MailAccount[];
  googleEnabled: boolean;
  notice?: "connected" | "error" | "google-auth" | "reauthorize";
}) {
  const router = useRouter();
  const hasGmailAccount = accounts.some(
    (account) => account.connector === "gmail",
  );
  const [adding, setAdding] = useState(!hasGmailAccount);
  const [removing, setRemoving] = useState<MailAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <div {...stylex.props(styles.group)}>
        <SettingsCard title="Email accounts">
          {notice ? (
            <SettingsRow>
              <div
                role={
                  notice === "connected" || notice === "google-auth"
                    ? "status"
                    : "alert"
                }
                {...stylex.props(styles.notice)}
              >
                <span {...stylex.props(styles.noticeIcon)}>
                  {notice === "connected" || notice === "google-auth" ? (
                    <Icons.check size={15} />
                  ) : (
                    <Icons.help size={15} />
                  )}
                </span>
                <p {...stylex.props(styles.secondary)}>
                  {notice === "connected"
                    ? "Gmail connected. Its inbox is ready in Remail."
                    : notice === "google-auth"
                      ? "Signed in with Google. Connect Gmail below to read and send mail from Remail."
                      : notice === "reauthorize"
                        ? "Google access expired or was revoked. Reconnect the account to continue."
                        : "Unable to connect Google. Check the OAuth setup and try again."}
                </p>
              </div>
            </SettingsRow>
          ) : null}

          {accounts.map((account) => (
            <SettingsRow key={account.id}>
              <div {...stylex.props(styles.identity)}>
                <MailAccountIcon connector={account.connector} size="large" />
                <div {...stylex.props(styles.details)}>
                  <span {...stylex.props(styles.providerName)}>
                    {getMailConnectorDefinition(account.connector).label}
                  </span>
                  <span {...stylex.props(styles.secondary)}>
                    {account.email} · {accountStatus(account)}
                  </span>
                </div>
              </div>
              <div {...stylex.props(styles.actions)}>
                {account.status === "setup" ? (
                  <Link href="/onboarding" {...stylex.props(styles.link)}>
                    Set up custom email
                  </Link>
                ) : account.connector === "gmail" &&
                  account.status === "reauthorize" ? (
                  googleEnabled ? (
                    <ConnectGmailButton label="Reconnect Gmail" />
                  ) : null
                ) : (
                  <Link
                    href={mailFolderHref("inbox", undefined, account.id)}
                    {...stylex.props(styles.link)}
                  >
                    Open inbox
                  </Link>
                )}
                {account.connector === "gmail" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setRemoving(account);
                    }}
                    {...stylex.props(styles.danger)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </SettingsRow>
          ))}

          {googleEnabled ? (
            <Collapsible.Root open={adding} onOpenChange={setAdding}>
              <Collapsible.Trigger
                className={stylex.props(styles.addTrigger).className}
                style={stylex.props(styles.addTrigger).style}
              >
                <Icons.add size={16} />
                <span {...stylex.props(styles.addLabel)}>Add another email</span>
                <span
                  {...stylex.props(
                    styles.chevron,
                    adding && styles.chevronOpen,
                  )}
                >
                  <Icons.chevronDown size={15} />
                </span>
              </Collapsible.Trigger>
              <Collapsible.Panel
                className={stylex.props(styles.addPanel).className}
                style={stylex.props(styles.addPanel).style}
              >
                <SettingsRow>
                  <div {...stylex.props(styles.identity)}>
                    <MailAccountIcon connector="gmail" size="large" />
                    <div {...stylex.props(styles.details)}>
                      <span {...stylex.props(styles.providerName)}>Gmail</span>
                      <p {...stylex.props(styles.secondary)}>
                        Connect {hasGmailAccount ? "another " : "a "}Google
                        account through the Gmail API.
                      </p>
                    </div>
                  </div>
                  <div {...stylex.props(styles.actions)}>
                    <ConnectGmailButton label="Connect Gmail" />
                  </div>
                </SettingsRow>
              </Collapsible.Panel>
            </Collapsible.Root>
          ) : null}
        </SettingsCard>
        {googleEnabled || hasGmailAccount ? (
          <p {...stylex.props(styles.privacy)}>
            Google credentials are encrypted at rest. Gmail message bodies and
            attachments are fetched when opened and aren’t stored by Remail.{" "}
            <Link href="/privacy" {...stylex.props(styles.privacyLink)}>
              Read the privacy policy.
            </Link>
          </p>
        ) : null}
      </div>

      <Dialog.Root
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup>
            <Dialog.Title>Remove this Gmail account?</Dialog.Title>
            <Dialog.Description>
              Remail will stop syncing {removing?.email}, revoke its Google
              access, and remove its local connection metadata. Your mail stays
              in Gmail.
            </Dialog.Description>
            {error ? (
              <p role="alert" {...stylex.props(styles.error)}>
                {error}
              </p>
            ) : null}
            <div {...stylex.props(styles.dialogActions)}>
              <Dialog.Close
                render={
                  <Button type="button" variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                }
              />
              <Button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!removing) return;
                  setBusy(true);
                  setError("");
                  const response = await fetch(
                    `/api/mail/accounts/${encodeURIComponent(removing.id)}`,
                    { method: "DELETE" },
                  ).catch(() => null);
                  if (!response?.ok) {
                    setBusy(false);
                    setError("Unable to remove this account. Try again.");
                    return;
                  }
                  setRemoving(null);
                  setBusy(false);
                  router.replace(mailAccountsHref);
                  router.refresh();
                }}
              >
                {busy ? "Removing…" : "Remove Gmail account"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
