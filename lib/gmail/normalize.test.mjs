import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeGmailAttachmentId,
  gmailThreadToDetail,
  parseGmailAddresses,
} from "./normalize.ts";

const encoded = (value) => Buffer.from(value).toString("base64url");

test("normalizes Gmail threads without persisting provider-specific shapes", () => {
  const detail = gmailThreadToDetail({
    id: "thread-1",
    messages: [
      {
        id: "message-1",
        threadId: "thread-1",
        internalDate: "1700000000000",
        labelIds: ["INBOX", "UNREAD", "STARRED"],
        snippet: "A useful preview",
        payload: {
          mimeType: "multipart/mixed",
          headers: [
            { name: "From", value: 'Mira Chen <mira@example.com>' },
            { name: "To", value: 'Ada <ada@example.com>' },
            { name: "Subject", value: "Design review" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: { data: encoded("Plain body") },
            },
            {
              mimeType: "application/pdf",
              filename: "review.pdf",
              body: { attachmentId: "attachment-1", size: 1200 },
            },
          ],
        },
      },
    ],
  });

  assert.equal(detail?.subject, "Design review");
  assert.equal(detail?.unread, true);
  assert.equal(detail?.favorite, true);
  assert.equal(detail?.messages[0].text, "Plain body");
  const attachment = detail?.messages[0].attachments[0];
  assert.equal(attachment?.filename, "review.pdf");
  assert.deepEqual(decodeGmailAttachmentId(attachment.id), {
    messageId: "message-1",
    attachmentId: "attachment-1",
    mimeType: "application/pdf",
    filename: "review.pdf",
  });
});

test("parses quoted Gmail address lists", () => {
  assert.deepEqual(
    parseGmailAddresses('"Chen, Mira" <mira@example.com>, ada@example.com'),
    [
      { name: "Chen, Mira", email: "mira@example.com" },
      { name: "", email: "ada@example.com" },
    ],
  );
});

test("rejects invalid public attachment identifiers", () => {
  assert.equal(decodeGmailAttachmentId("not-an-id"), null);
});
