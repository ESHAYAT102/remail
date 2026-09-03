import assert from "node:assert/strict";
import test from "node:test";
import {
  messageSpacing,
  NEARBY_SENDER_WINDOW_MS,
} from "./message-grouping.ts";

const message = (email, date) => ({ from: { name: "", email }, date });

test("nearby consecutive messages from the same sender form a compact group", () => {
  const previous = message("mira@example.com", "2026-09-01T14:00:00Z");
  const current = message("MIRA@example.com", "2026-09-01T14:29:00Z");
  assert.equal(messageSpacing(previous, current), "compact");
});

test("same-sender messages outside the nearby window keep the normal gap", () => {
  const previous = message("mira@example.com", "2026-09-01T14:00:00Z");
  const current = message(
    "mira@example.com",
    new Date(new Date(previous.date).getTime() + NEARBY_SENDER_WINDOW_MS + 1).toISOString(),
  );
  assert.equal(messageSpacing(previous, current), "default");
});

test("sender and day changes create a separated group", () => {
  const previous = message("mira@example.com", "2026-09-01T14:00:00Z");
  assert.equal(
    messageSpacing(previous, message("kenji@example.com", "2026-09-01T14:05:00Z")),
    "separated",
  );
  assert.equal(
    messageSpacing(previous, message("mira@example.com", "2026-09-02T14:05:00Z")),
    "separated",
  );
});
