import assert from "node:assert/strict";
import test from "node:test";
import {
  composeFromRequest,
  validateComposeInput,
} from "./compose.ts";

test("normalizes trusted compose fields and attachment sizes", () => {
  const input = validateComposeInput({
    to: "person@example.com",
    subject: "Hello",
    text: "Body",
    attachments: [
      {
        filename: "hello.txt",
        mimeType: "text/plain",
        size: 999,
        data: Buffer.from("hello").toString("base64"),
      },
    ],
  });

  assert.equal(input.attachments?.[0]?.size, 5);
  assert.equal(input.cc, undefined);
});

test("rejects malformed JSON attachment payloads", () => {
  assert.throws(
    () =>
      validateComposeInput({
        to: "person@example.com",
        subject: "Hello",
        text: "Body",
        attachments: [
          {
            filename: "bad.txt",
            mimeType: "text/plain",
            data: "not base64!",
          },
        ],
      }),
    /invalid/i,
  );
});

test("preserves authored line breaks and sanitizes rich message HTML", async () => {
  const form = new FormData();
  form.set("to", "  reader@example.com  ");
  form.set("subject", "Line breaks");
  form.set("text", "First line\n\nThird line");
  form.set(
    "html",
    '<div class="redakt-composer"><p onclick="steal()">First line</p><p></p><p><b>Third</b> line</p><script>steal()</script></div>',
  );

  const input = await composeFromRequest(
    new Request("https://redakt.test/api/mail/send", { method: "POST", body: form }),
  );

  assert.equal(input.to, "reader@example.com");
  assert.equal(input.text, "First line\n\nThird line");
  assert.match(input.html, /class="redakt-composer"/);
  assert.match(input.html, /style="white-space:pre-wrap"/);
  assert.match(input.html, /<p style="margin:0"><b>Third<\/b> line<\/p>/);
  assert.doesNotMatch(input.html, /onclick|script|steal/);
});

test("rejects malformed rich text fields", () => {
  assert.throws(
    () =>
      validateComposeInput({
        to: "reader@example.com",
        subject: "Hello",
        text: "Hello",
        html: 42,
      }),
    /Invalid HTML message/,
  );
});
