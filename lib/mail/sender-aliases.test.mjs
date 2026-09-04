import assert from "node:assert/strict";
import test from "node:test";
import {
  fuzzySenderAliases,
  isValidSenderAlias,
  normalizeSenderAlias,
} from "./sender-aliases.ts";

test("normalizes and validates sender aliases", () => {
  assert.equal(normalizeSenderAlias("  Hello  "), "hello");
  assert.equal(isValidSenderAlias("hello.team"), true);
  assert.equal(isValidSenderAlias("hello@example.com"), false);
  assert.equal(isValidSenderAlias(""), false);
});

test("fuzzy sender search ranks exact and typo-tolerant matches", () => {
  assert.deepEqual(fuzzySenderAliases("info"), ["info"]);
  assert.deepEqual(fuzzySenderAliases("helo"), ["hello"]);
  assert.deepEqual(fuzzySenderAliases("sup"), ["support"]);
});
