import { mailAccountsHref } from "../mail/routes.ts";
import { GMAIL_MODIFY_SCOPE } from "./scopes.ts";

const GOOGLE_PROVIDER = "google" as const;

export function getGoogleSignInOptions({
  addingAccount = false,
}: { addingAccount?: boolean } = {}) {
  return {
    provider: GOOGLE_PROVIDER,
    callbackURL: "/mail/inbox",
    newUserCallbackURL: "/mail/settings/account?welcome=google",
    errorCallbackURL: addingAccount
      ? "/?add=account&auth=google"
      : "/?auth=google",
    additionalParams: {
      access_type: "online",
      include_granted_scopes: "false",
      prompt: "select_account",
    },
  };
}

export function getGmailAuthorizationOptions(errorCallbackURL: string) {
  return {
    provider: GOOGLE_PROVIDER,
    scopes: [GMAIL_MODIFY_SCOPE],
    callbackURL: "/api/mail/accounts/google/complete",
    errorCallbackURL,
    additionalParams: {
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "select_account consent",
    },
  };
}

export function gmailCompletionRedirectUrl(
  appUrl: string,
  outcome: "connected" | "error" | "unauthorized",
) {
  const url = new URL(
    outcome === "unauthorized" ? "/" : mailAccountsHref,
    appUrl,
  );
  if (outcome === "unauthorized") {
    url.searchParams.set("google", "unauthorized");
  } else {
    url.searchParams.set(outcome, outcome === "connected" ? "1" : "google");
  }
  return url;
}
