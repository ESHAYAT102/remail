"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getGmailAuthorizationOptions } from "@/lib/google/oauth";
import { mailAccountsHref } from "@/lib/mail/routes";
import { colors, fonts } from "@/theme/tokens.stylex";

const styles = stylex.create({
  error: {
    color: colors.danger,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

export function ConnectGmailButton({
  disabled,
  label,
}: {
  disabled?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actionLabel = label ?? "Add Gmail account";

  return (
    <>
      <Button
        type="button"
        variant="soft"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.linkSocial(
              getGmailAuthorizationOptions(
                `${mailAccountsHref}?error=google`,
              ),
            );
            if (!result.error) return;
          } catch {
            // The inline error keeps a failed popup or network request recoverable.
          }
          setBusy(false);
          setError("Google couldn’t be connected. Try again.");
        }}
      >
        {busy ? "Opening Google…" : actionLabel}
      </Button>
      {error ? (
        <span role="alert" {...stylex.props(styles.error)}>
          {error}
        </span>
      ) : null}
    </>
  );
}
