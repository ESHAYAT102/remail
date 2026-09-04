"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import { authClient } from "@/lib/auth-client";
import type { DomainSetup } from "@/lib/mail/types";

const steps = ["domain", "resend", "name"] as const;
type CustomDomainStep = (typeof steps)[number];
type Step = CustomDomainStep;
const RESEND_WEBHOOK_URL = "https://mail.eshayat.com/api/webhooks/resend";

const copy: Record<Step, { title: string; lead: string }> = {
  domain: {
    title: "What domain should receive mail?",
    lead: "Enter a domain you already own.",
  },
  resend: {
    title: "Connect Resend",
    lead: "Use your Resend credentials to manage sending and domain-wide receiving.",
  },
  name: {
    title: "What’s your name?",
    lead: "This name appears on mail you send.",
  },
};

const styles = stylex.create({
  stage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.shell,
    paddingInline: space[5],
    paddingBlock: space[6],
  },
  stack: {
    width: "min(400px, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: space[4],
  },
  meta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
  },
  mark: {
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    letterSpacing: fonts.microTrack,
    color: colors.textFaint,
    fontWeight: 550,
    textTransform: "uppercase",
  },
  progress: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  title: {
    fontSize: fonts.displaySize,
    lineHeight: 1.15,
    fontWeight: 500,
    color: colors.text,
    letterSpacing: "-0.03em",
    textWrap: "balance",
  },
  lead: {
    fontSize: fonts.bodySize,
    lineHeight: fonts.bodyLine,
    color: colors.textMuted,
    maxWidth: "48ch",
    textWrap: "pretty",
  },
  form: {
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
    height: 32,
    borderWidth: 0,
    borderRadius: radius.md,
    paddingInline: space[3],
    fontSize: fonts.uiSize,
    color: colors.text,
    backgroundColor: colors.surface,
    width: "100%",
    "::placeholder": {
      color: colors.textFaint,
    },
    "@media (max-width: 640px)": {
      fontSize: "16px",
      height: 40,
    },
  },
  invalid: {
    boxShadow: `0 0 0 1px ${colors.danger}`,
  },
  hint: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  endpointRow: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  },
  endpointInput: {
    flex: 1,
    minWidth: 0,
    width: "auto",
    fontVariantNumeric: "tabular-nums",
  },
  error: {
    fontSize: fonts.captionSize,
    color: colors.text,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  switch: {
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontFamily: "inherit",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    cursor: "pointer",
    padding: 0,
    textAlign: "center",
    ":disabled": { opacity: 0.45, cursor: "not-allowed" },
    "@media (hover: hover)": {
      ":hover": { color: colors.text },
    },
  },
});

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      {children}
    </label>
  );
}

export function Onboarding({
  authenticated,
  addingAccount = false,
  demoMode,
  initialError,
  initialName,
}: {
  authenticated: boolean;
  addingAccount?: boolean;
  demoMode: boolean;
  initialError?: string;
  initialName?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("domain");
  const [name, setName] = useState(initialName ?? "");
  const [password, setPassword] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [domainName, setDomainName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [invalid, setInvalid] = useState(false);
  const [accountReady, setAccountReady] = useState(!addingAccount);

  const index = steps.indexOf(step);
  const text = copy[step];

  const go = (next: Step) => {
    setError("");
    setInvalid(false);
    setStep(next);
  };

  const back = () => {
    if (index === 0) {
      router.push("/");
      return;
    }
    go(steps[index - 1]);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountReady) return;
    setError("");

    if (step === "domain") {
      if (!domainName.trim() || !domainName.includes(".")) {
        setInvalid(true);
        setError("Enter a domain like acme.com.");
        return;
      }
      go("resend");
      return;
    }

    if (step === "resend") {
      if (
        !apiKey.trim().startsWith("re_") ||
        !webhookSecret.trim().startsWith("whsec_") ||
        (!authenticated && (!accountEmail.includes("@") || !password))
      ) {
        setInvalid(true);
        setError("Enter your Resend credentials and Remail account details.");
        return;
      }
      const host = domainName.trim().toLowerCase();
      const address = accountEmail.trim().toLowerCase();
      setBusy(true);
      if (!authenticated) {
        let authenticatedAccount = false;
        if (demoMode) {
          const demo = await fetch("/api/auth/demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: address,
              password,
              name: address.split("@")[0],
            }),
          });
          authenticatedAccount = demo.ok;
        }
        if (!authenticatedAccount) {
          const created = await authClient.signUp.email({
            name: address.split("@")[0],
            email: address,
            password,
          });
          if (created.error) {
            const signedIn = await authClient.signIn.email({
              email: address,
              password,
            });
            if (signedIn.error) {
              setBusy(false);
              const accountExists =
                created.error.code === "USER_ALREADY_EXISTS" ||
                created.error.code ===
                  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
                created.error.message?.toLowerCase().includes("already exists");
              setError(
                accountExists
                  ? "This Remail account already exists, but that password did not match. Sign in instead or use the original password."
                  : created.error.message ?? "Unable to create your account.",
              );
              setInvalid(true);
              return;
            }
          }
        }
      }
      const credentials = await fetch("/api/settings/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, webhookSecret }),
      });
      if (!credentials.ok) {
        const body = (await credentials.json().catch(() => null)) as { error?: string } | null;
        setBusy(false);
        setError(body?.error ?? "Unable to connect Resend.");
        setInvalid(true);
        return;
      }
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: host,
          mailbox: address.endsWith(`@${host}`) ? address.split("@")[0] : "me",
        }),
      });
      setBusy(false);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Unable to add this domain. Check the name, then try again.");
        setInvalid(true);
        return;
      }
      go("name");
      return;
    }

    if (step === "name") {
      if (!name.trim()) {
        setInvalid(true);
        setError("Enter the name that should appear on mail you send.");
        return;
      }
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      router.replace("/mail/inbox");
      router.refresh();
    }
  };

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

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    void (async () => {
      const list = await fetch("/api/domains");
      if (!list.ok) return;
      const json = (await list.json()) as { domains: DomainSetup[] };
      const next = json.domains[0];
      if (cancelled || !next) return;
      router.replace("/mail/inbox");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, router]);

  return (
    <main id="main" {...stylex.props(styles.stage)}>
      <div {...stylex.props(styles.stack)}>
        <div {...stylex.props(styles.meta)}>
          <div {...stylex.props(styles.mark)}>Remail</div>
          <div {...stylex.props(styles.progress)}>
            {`Step ${index + 1} of ${steps.length}`}
          </div>
        </div>
        <div {...stylex.props(styles.copy)}>
          <h1 {...stylex.props(styles.title)}>{text.title}</h1>
          <p {...stylex.props(styles.lead)}>{text.lead}</p>
        </div>

        <form {...stylex.props(styles.form)} onSubmit={onSubmit}>
            {step === "domain" ? (
              <Field id="onboard-domain" label="Domain">
                <input
                  id="onboard-domain"
                  {...stylex.props(styles.input, invalid && styles.invalid)}
                  value={domainName}
                  onChange={(event) => setDomainName(event.target.value)}
                  name="domain"
                  placeholder="acme.com"
                  autoComplete="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  aria-invalid={invalid || undefined}
                  aria-describedby={error ? "onboard-error" : undefined}
                />
              </Field>
            ) : null}
            {step === "resend" ? (
              <>
                {!authenticated ? (
                  <Field id="onboard-account-email" label="Remail account email">
                    <input
                      id="onboard-account-email"
                      {...stylex.props(styles.input, invalid && styles.invalid)}
                      value={accountEmail}
                      onChange={(event) => setAccountEmail(event.target.value)}
                      name="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      aria-invalid={invalid || undefined}
                    />
                  </Field>
                ) : null}
                {!authenticated ? (
                  <Field id="onboard-password" label="Remail password">
                    <input
                      id="onboard-password"
                      {...stylex.props(styles.input, invalid && styles.invalid)}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      aria-invalid={invalid || undefined}
                    />
                  </Field>
                ) : null}
                <Field id="onboard-resend-key" label="Resend API key">
                  <input
                    id="onboard-resend-key"
                    {...stylex.props(styles.input, invalid && styles.invalid)}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    name="resend-api-key"
                    type="password"
                    placeholder="re_…"
                    autoComplete="off"
                    autoFocus={authenticated}
                    aria-invalid={invalid || undefined}
                    aria-describedby={error ? "onboard-error" : undefined}
                  />
                </Field>
                <Field id="onboard-resend-webhook" label="Webhook signing secret">
                  <input
                    id="onboard-resend-webhook"
                    {...stylex.props(styles.input, invalid && styles.invalid)}
                    value={webhookSecret}
                    onChange={(event) => setWebhookSecret(event.target.value)}
                    type="password"
                    name="resend-webhook-secret"
                    placeholder="whsec_…"
                    autoComplete="off"
                    aria-invalid={invalid || undefined}
                    aria-describedby={error ? "onboard-error" : undefined}
                  />
                </Field>
                <div {...stylex.props(styles.field)}>
                  <label
                    htmlFor="onboard-resend-endpoint"
                    {...stylex.props(styles.label)}
                  >
                    Webhook endpoint URL
                  </label>
                  <div {...stylex.props(styles.endpointRow)}>
                    <input
                      id="onboard-resend-endpoint"
                      {...stylex.props(styles.input, styles.endpointInput)}
                      value={RESEND_WEBHOOK_URL}
                      readOnly
                      aria-describedby="onboard-resend-endpoint-help"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="soft"
                      aria-live="polite"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(RESEND_WEBHOOK_URL);
                          setCopyStatus("copied");
                        } catch {
                          setCopyStatus("failed");
                        }
                      }}
                    >
                      {copyStatus === "copied"
                        ? "Copied"
                        : copyStatus === "failed"
                          ? "Copy manually"
                          : "Copy"}
                    </Button>
                  </div>
                </div>
                <div id="onboard-resend-endpoint-help" {...stylex.props(styles.hint)}>
                  In Resend, create an email.received webhook and paste this into
                  the Endpoint URL field.
                </div>
              </>
            ) : null}
            {step === "name" ? (
              <Field id="onboard-name" label="Name">
                <input
                  id="onboard-name"
                  {...stylex.props(styles.input, invalid && styles.invalid)}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  name="name"
                  placeholder="Ada Meridian"
                  autoComplete="name"
                  autoFocus
                  aria-invalid={invalid || undefined}
                  aria-describedby={error ? "onboard-error" : undefined}
                />
              </Field>
            ) : null}
            {error ? (
              <div id="onboard-error" role="alert" {...stylex.props(styles.error)}>
                {error}
              </div>
            ) : null}
            <div {...stylex.props(styles.actions)}>
              <Button type="submit" disabled={busy}>
                Continue
              </Button>
              <button type="button" {...stylex.props(styles.switch)} onClick={back}>
                Back
              </button>
            </div>
        </form>
      </div>
    </main>
  );
}
