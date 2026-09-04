import assert from "node:assert/strict";
import test from "node:test";
import { defaultSenderEmail, senderAliasOnDomain } from "./identity.ts";

test("uses the login email when it belongs to the mailbox domain", () => {
  assert.equal(
    defaultSenderEmail("inbox@eshayat.com", "", "hello@eshayat.com"),
    "hello@eshayat.com",
  );
  assert.equal(senderAliasOnDomain("Hello@ESHAYAT.COM", "eshayat.com"), "hello");
});

test("keeps the mailbox fallback for a login on another domain", () => {
  assert.equal(
    defaultSenderEmail("inbox@eshayat.com", "", "hello@example.com"),
    "inbox@eshayat.com",
  );
});

test("an explicit sender alias takes precedence over the login email", () => {
  assert.equal(
    defaultSenderEmail("inbox@eshayat.com", "support", "hello@eshayat.com"),
    "support@eshayat.com",
  );
});
