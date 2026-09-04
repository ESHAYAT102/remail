import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleSignInOptions } from "./oauth.ts";
import { GOOGLE_IDENTITY_SCOPES } from "./scopes.ts";

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
