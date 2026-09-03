"use client";

import Image from "next/image";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getGoogleSignInOptions } from "@/lib/google/oauth";
import { colors, fonts } from "@/theme/tokens.stylex";

const styles = stylex.create({
  logo: {
    display: "block",
  },
  error: {
    color: colors.danger,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

export function GoogleSignInButton({
  disabled,
  addingAccount = false,
  onStart,
}: {
  disabled?: boolean;
  addingAccount?: boolean;
  onStart?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <Button
        type="button"
        variant="soft"
        disabled={disabled || busy}
        onClick={async () => {
          onStart?.();
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signIn.social(
              getGoogleSignInOptions({ addingAccount }),
            );
            if (!result.error) return;
          } catch {
            // Keep failed popup and network starts recoverable in place.
          }
          setBusy(false);
          setError("Google sign-in couldn’t start. Try again.");
        }}
      >
        <Image
          src="/providers/google.svg"
          alt=""
          width={18}
          height={18}
          unoptimized
          {...stylex.props(styles.logo)}
        />
        {busy ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? (
        <span role="alert" {...stylex.props(styles.error)}>
          {error}
        </span>
      ) : null}
    </>
  );
}
