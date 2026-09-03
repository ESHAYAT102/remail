import assert from "node:assert/strict";
import test from "node:test";
import { buildGmailRawMessage } from "./mime.ts";

test("builds a base64url RFC 822 message with reply and attachment metadata", () => {
  const result = buildGmailRawMessage(
    { name: "Ada Lovelace", email: "ada@example.com" },
    {
      to: "mira@example.com",
      cc: "team@example.com",
      subject: "Résumé review",
      text: "Looks good.\nShip it.",
      attachments: [
        {
          filename: "notes.txt",
          mimeType: "text/plain",
          size: 5,
          data: Buffer.from("hello").toString("base64"),
        },
      ],
    },
    {
      messageId: "<source@example.com>",
      references: "<older@example.com> <source@example.com>",
      threadId: "thread-1",
    },
  );
  const source = Buffer.from(result.raw, "base64url").toString("utf8");

  assert.equal(result.threadId, "thread-1");
  assert.match(source, /^From: Ada Lovelace <ada@example.com>/);
  assert.match(source, /Subject: =\?UTF-8\?B\?/);
  assert.match(source, /In-Reply-To: <source@example.com>/);
  assert.match(source, /Content-Type: multipart\/mixed/);
  assert.match(source, /Content-Disposition: attachment; filename="notes.txt"/);
  assert.match(source, /aGVsbG8=/);
});

test("strips header injection from compose fields", () => {
  const result = buildGmailRawMessage(
    { name: "Ada", email: "ada@example.com" },
    {
      to: "mira@example.com\r\nBcc: attacker@example.com",
      subject: "Hello\r\nX-Evil: yes",
      text: "Body",
    },
  );
  const source = Buffer.from(result.raw, "base64url").toString("utf8");
  assert.doesNotMatch(source, /\r\nX-Evil:/);
  assert.equal((source.match(/\r\nBcc:/g) ?? []).length, 0);
});

test("sends rich messages as plain text and HTML alternatives", () => {
  const result = buildGmailRawMessage(
    { name: "Ada", email: "ada@example.com" },
    {
      to: "mira@example.com",
      subject: "Formatted",
      text: "First line\n\nBold line",
      html: '<div class="redakt-composer"><p>First line</p><p></p><p><b>Bold line</b></p></div>',
    },
  );
  const source = Buffer.from(result.raw, "base64url").toString("utf8");

  assert.match(source, /Content-Type: multipart\/alternative/);
  assert.match(source, /Content-Type: text\/plain; charset=UTF-8/);
  assert.match(source, /First line\r\n\r\nBold line/);
  assert.match(source, /Content-Type: text\/html; charset=UTF-8/);
  assert.match(source, /<p><b>Bold line<\/b><\/p>/);
});

test("nests rich alternatives inside messages with attachments", () => {
  const result = buildGmailRawMessage(
    { name: "Ada", email: "ada@example.com" },
    {
      to: "mira@example.com",
      subject: "Formatted attachment",
      text: "See attachment",
      html: "<p>See <b>attachment</b></p>",
      attachments: [
        {
          filename: "notes.txt",
          mimeType: "text/plain",
          size: 5,
          data: Buffer.from("hello").toString("base64"),
        },
      ],
    },
  );
  const source = Buffer.from(result.raw, "base64url").toString("utf8");

  assert.match(source, /Content-Type: multipart\/mixed/);
  assert.match(source, /Content-Type: multipart\/alternative/);
  assert.match(source, /Content-Disposition: attachment; filename="notes.txt"/);
});
