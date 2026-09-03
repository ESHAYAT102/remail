import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret } from "./secret.ts";

test("requires an explicit key and round-trips mailbox secrets", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  try {
    delete process.env.BETTER_AUTH_SECRET;
    assert.throws(() => encryptSecret("mailbox-password"), /is required/);

    process.env.BETTER_AUTH_SECRET = "test-only-secret";
    const encrypted = encryptSecret("mailbox-password");
    assert.notEqual(encrypted, "mailbox-password");
    assert.equal(decryptSecret(encrypted), "mailbox-password");
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previous;
  }
});
