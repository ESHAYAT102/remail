import assert from "node:assert/strict";
import test from "node:test";
import {
  gmailCompletionRedirectUrl,
  getGmailAuthorizationOptions,
  getGoogleSignInOptions,
} from "./oauth.ts";
import { GMAIL_MODIFY_SCOPE, GOOGLE_IDENTITY_SCOPES } from "./scopes.ts";

test("Google sign-in is limited to identity access", () => {
  assert.deepEqual(GOOGLE_IDENTITY_SCOPES, ["openid", "email", "profile"]);

  const options = getGoogleSignInOptions();
  assert.equal("scopes" in options, false);
  assert.equal(options.additionalParams.access_type, "online");
  assert.equal(options.additionalParams.include_granted_scopes, "false");
  assert.equal(options.additionalParams.prompt, "select_account");
  assert.equal(options.callbackURL, "/mail/inbox");
  assert.equal(
    options.newUserCallbackURL,
    "/onboarding?auth=google",
  );
  assert.equal(options.errorCallbackURL, "/?auth=google");
  assert.equal(
    getGoogleSignInOptions({ addingAccount: true }).errorCallbackURL,
    "/?add=account&auth=google",
  );
});

test("Gmail linking explicitly requests mailbox access and an offline grant", () => {
  const options = getGmailAuthorizationOptions(
    "/mail/settings/account?error=google",
  );
  assert.deepEqual(options.scopes, [GMAIL_MODIFY_SCOPE]);
  assert.equal(options.additionalParams.access_type, "offline");
  assert.equal(options.additionalParams.include_granted_scopes, "true");
  assert.equal(options.additionalParams.prompt, "select_account consent");
  assert.equal(options.callbackURL, "/api/mail/accounts/google/complete");
});

test("Gmail completion redirects always use the configured public app origin", () => {
  const appUrl = "https://redakt-staging.up.railway.app";
  assert.equal(
    gmailCompletionRedirectUrl(appUrl, "connected").href,
    `${appUrl}/mail/settings/account?connected=1`,
  );
  assert.equal(
    gmailCompletionRedirectUrl(appUrl, "error").href,
    `${appUrl}/mail/settings/account?error=google`,
  );
  assert.equal(
    gmailCompletionRedirectUrl(appUrl, "unauthorized").href,
    `${appUrl}/?google=unauthorized`,
  );
});
