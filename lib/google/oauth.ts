const GOOGLE_PROVIDER = "google" as const;

export function getGoogleSignInOptions({
  addingAccount = false,
}: { addingAccount?: boolean } = {}) {
  return {
    provider: GOOGLE_PROVIDER,
    callbackURL: "/mail/inbox",
    newUserCallbackURL: "/onboarding?auth=google",
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
