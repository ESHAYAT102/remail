"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import { authClient } from "@/lib/auth-client";
import type { LoginFields } from "@/lib/login";

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: space[4],
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: space[1],
  },
  label: {
    fontSize: fonts.captionSize,
    fontWeight: 500,
    color: colors.textMuted,
  },
  input: {
    width: "100%",
    minHeight: 40,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingInline: space[3],
    fontSize: fonts.uiSize,
    color: colors.text,
    backgroundColor: colors.surface,
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
    "::placeholder": {
      color: colors.textFaint,
    },
    "@media (max-width: 640px)": {
      fontSize: "16px",
      minHeight: 44,
    },
  },
  invalid: {
    boxShadow: `0 0 0 1px ${colors.danger}`,
  },
  error: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.text,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  submit: {
    width: "100%",
    minHeight: 40,
    "@media (max-width: 640px)": {
      minHeight: 44,
    },
  },
  secondaryActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space[1],
  },
  switch: {
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontFamily: "inherit",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    cursor: "pointer",
    minHeight: 32,
    paddingInline: space[2],
    paddingBlock: space[1],
    borderRadius: radius.md,
    textAlign: "center",
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text },
    },
    "@media (max-width: 640px)": {
      minHeight: 44,
    },
  },
});

export function LoginForm({
  initialLogin,
  initialError,
  addingAccount = false,
}: {
  initialLogin: LoginFields;
  initialError?: string;
  addingAccount?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialLogin.email);
  const [password, setPassword] = useState(initialLogin.password);
  const [error, setError] = useState(initialError ?? "");
  const [accountReady, setAccountReady] = useState(!addingAccount);

  useEffect(() => {
    if (!addingAccount) return;
    let cancelled = false;
    void fetch("/api/auth/multi-session/preserve-current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((response) => {
        if (cancelled) return;
        if (response.ok) {
          setAccountReady(true);
          return;
        }
        setError(
          "Unable to keep your current account signed in. Return to your inbox and try again.",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError(
          "Unable to keep your current account signed in. Return to your inbox and try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [addingAccount]);

  return (
    <form
      {...stylex.props(styles.form)}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const demo = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (demo.ok) {
          router.replace("/mail/inbox");
          router.refresh();
          return;
        }
        if (!accountReady) return;
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError("Unable to sign in. Check email and password, then try again.");
          return;
        }
        router.replace("/mail");
        router.refresh();
      }}
    >
      <div {...stylex.props(styles.fields)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Email</span>
          <input
            {...stylex.props(styles.input, error ? styles.invalid : null)}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            name="email"
            placeholder="you@acme.com"
            autoComplete="username"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Password</span>
          <input
            {...stylex.props(styles.input, error ? styles.invalid : null)}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </label>
      </div>
      {error ? (
        <div id="login-error" role="alert" {...stylex.props(styles.error)}>
          {error}
        </div>
      ) : null}
      <div {...stylex.props(styles.actions)}>
        <Button
          type="submit"
          disabled={!accountReady}
          className={stylex.props(styles.submit).className}
        >
          {addingAccount
            ? accountReady
              ? "Add account"
              : "Preparing account switcher…"
            : "Open inbox"}
        </Button>
      </div>
      <div {...stylex.props(styles.secondaryActions)}>
        <button
          type="button"
          {...stylex.props(styles.switch)}
          onClick={() =>
            router.push(addingAccount ? "/onboarding?add=account" : "/onboarding")
          }
        >
          {addingAccount ? "Create another account" : "Create an account"}
        </button>
        {addingAccount ? (
          <button
            type="button"
            {...stylex.props(styles.switch)}
            onClick={() => router.push("/mail")}
          >
            Back to inbox
          </button>
        ) : null}
      </div>
    </form>
  );
}
