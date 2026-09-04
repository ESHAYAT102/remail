import assert from "node:assert/strict";
import test from "node:test";
import {
  stripHtmlReplyHistory,
  stripPlainTextReplyHistory,
} from "./reply-content.ts";

test("strips Gmail plain-text reply history", () => {
  assert.equal(
    stripPlainTextReplyHistory(
      "Hey, how are you?\n\nOn Fri, Sep 4, 2026 at 5:44 PM Me <me@example.com> wrote:\n> Hey there!",
    ),
    "Hey, how are you?",
  );
});

test("strips a trailing plain-text quote without an attribution", () => {
  assert.equal(
    stripPlainTextReplyHistory("New answer\n\n> Previous message\n> second line"),
    "New answer",
  );
});

test("strips Gmail quoted HTML", () => {
  assert.equal(
    stripHtmlReplyHistory(
      '<div dir="ltr">Hey, how are you?</div><div class="gmail_quote gmail_quote_container">Old mail</div>',
    ),
    '<div dir="ltr">Hey, how are you?</div>',
  );
});
