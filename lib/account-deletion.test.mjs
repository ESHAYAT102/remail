import assert from "node:assert/strict";
import test from "node:test";
import {
  accountDeletionFallback,
  requestAccountDeletion,
} from "./account-deletion.ts";

test("returns the API error from a failed account deletion", async () => {
  const result = await requestAccountDeletion("password", async (input, init) => {
    assert.equal(input, "/api/settings/account");
    assert.equal(init.method, "DELETE");
    assert.equal(init.body, JSON.stringify({ password: "password" }));
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  });

  assert.deepEqual(result, { ok: false, error: "Incorrect password." });
});

test("falls back when a failed account deletion returns malformed JSON", async () => {
  const result = await requestAccountDeletion(
    "password",
    async () => new Response("Bad gateway", { status: 502 }),
  );

  assert.deepEqual(result, { ok: false, error: accountDeletionFallback });
});

test("falls back when the account deletion request fails", async () => {
  const result = await requestAccountDeletion("password", async () => {
    throw new TypeError("Failed to fetch");
  });

  assert.deepEqual(result, { ok: false, error: accountDeletionFallback });
});

test("reports a successful account deletion", async () => {
  const result = await requestAccountDeletion(
    "password",
    async () => Response.json({ ok: true }),
  );

  assert.deepEqual(result, { ok: true });
});
