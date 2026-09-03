import assert from "node:assert/strict";
import test from "node:test";
import { matchesBearerToken } from "./tokens.ts";

test("matches only the exact cron bearer token", () => {
  assert.equal(matchesBearerToken("Bearer correct", "correct"), true);
  assert.equal(matchesBearerToken("Bearer incorrect", "correct"), false);
  assert.equal(matchesBearerToken("bearer correct", "correct"), false);
  assert.equal(matchesBearerToken(null, "correct"), false);
  assert.equal(matchesBearerToken("Bearer correct", null), false);
});
