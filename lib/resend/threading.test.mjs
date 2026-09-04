import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackReplyThread,
  normalizeMessageId,
  normalizedThreadSubject,
  referencedMessageIds,
} from "./threading.ts";

test("normalizes Message-IDs and reads case-insensitive reply headers", () => {
  assert.equal(normalizeMessageId(" <ABC@example.COM> "), "abc@example.com");
  assert.deepEqual(
    referencedMessageIds({
      "In-Reply-To": "<parent@example.com>",
      References: "<root@example.com> <parent@example.com>",
    }),
    ["parent@example.com", "root@example.com"],
  );
});

test("normalizes repeated reply and forward subject prefixes", () => {
  assert.equal(
    normalizedThreadSubject(" Re: Fwd: RE: Project update "),
    "project update",
  );
});

test("falls back only for a reply from an existing participant", () => {
  const candidates = [
    {
      threadId: "thread-1",
      subject: "Project update",
      from: { email: "me@example.com" },
      to: [{ email: "person@example.net" }],
      cc: [],
      bcc: [],
      replyTo: [],
    },
  ];
  assert.equal(
    fallbackReplyThread("Re: Project update", "PERSON@example.net", candidates),
    "thread-1",
  );
  assert.equal(
    fallbackReplyThread("Re: Project update", "stranger@example.net", candidates),
    null,
  );
  assert.equal(
    fallbackReplyThread("Project update", "person@example.net", candidates),
    null,
  );
});
