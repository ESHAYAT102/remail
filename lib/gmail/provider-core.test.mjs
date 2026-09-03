import assert from "node:assert/strict";
import test from "node:test";
import {
  gmailQuery,
  hydrateGmailThreadBodies,
  listGmailReferences,
} from "./provider-core.ts";
import { gmailThreadToDetail } from "./normalize.ts";

test("hydrates Gmail body parts stored behind attachment IDs", async () => {
  const thread = {
    id: "thread-1",
    messages: [
      {
        id: "message-1",
        threadId: "thread-1",
        labelIds: ["INBOX", "Label_42"],
        snippet: "Truncated preview",
        payload: {
          mimeType: "multipart/mixed",
          parts: [
            {
              mimeType: "text/plain",
              body: { attachmentId: "large-body", size: 1_500_000 },
            },
            {
              mimeType: "text/plain",
              filename: "notes.txt",
              headers: [
                { name: "Content-Disposition", value: "attachment" },
              ],
              body: { attachmentId: "notes", size: 20 },
            },
          ],
        },
      },
    ],
  };
  const requested = [];

  await hydrateGmailThreadBodies(thread, async (messageId, attachmentId) => {
    requested.push([messageId, attachmentId]);
    return { data: Buffer.from("Complete large body").toString("base64url") };
  });

  const detail = gmailThreadToDetail(thread);
  assert.deepEqual(requested, [["message-1", "large-body"]]);
  assert.equal(detail?.messages[0].text, "Complete large body");
  assert.equal(detail?.messages[0].attachments.length, 1);
  assert.equal(detail?.messages[0].attachments[0].filename, "notes.txt");
  assert.deepEqual(detail?.collectionIds, ["INBOX", "Label_42"]);
});

test("surfaces a body hydration failure instead of falling back to a snippet", async () => {
  const thread = {
    id: "thread-1",
    messages: [
      {
        id: "message-1",
        threadId: "thread-1",
        payload: {
          mimeType: "text/html",
          body: { attachmentId: "large-html" },
        },
      },
    ],
  };
  await assert.rejects(
    hydrateGmailThreadBodies(thread, async () => {
      throw new Error("attachment unavailable");
    }),
    /attachment unavailable/,
  );
});

test("paginates Gmail references up to the requested window", async () => {
  const calls = [];
  const pages = [
    {
      references: [{ id: "one" }, { id: "two" }],
      nextPageToken: "next",
      resultSizeEstimate: 7,
    },
    {
      references: [{ id: "three" }],
      resultSizeEstimate: 7,
    },
  ];
  const result = await listGmailReferences(3, async (input) => {
    calls.push(input);
    return pages.shift();
  });
  assert.deepEqual(calls, [
    { maxResults: 3, pageToken: undefined },
    { maxResults: 1, pageToken: "next" },
  ]);
  assert.deepEqual(result, {
    ids: ["one", "two", "three"],
    estimate: 7,
    hasMore: false,
  });
});

test("builds Gmail queries from provider-neutral list filters", () => {
  assert.equal(
    gmailQuery("inbox", {
      q: "from:ada@example.com",
      unread: true,
      hasAttachment: true,
    }),
    "in:inbox from:ada@example.com is:unread has:attachment",
  );
  assert.equal(
    gmailQuery("collection:Label_42", { q: "receipt", unread: true }),
    "receipt is:unread",
  );
});
