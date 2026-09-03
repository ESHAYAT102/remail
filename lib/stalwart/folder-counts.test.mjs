import assert from "node:assert/strict";
import test from "node:test";
import { stalwartFolderCounts } from "./folder-counts.ts";

test("builds every sidebar count from mailbox metadata", () => {
  assert.deepEqual(
    stalwartFolderCounts(
      [
        { role: "inbox", totalThreads: 18, unreadThreads: 5 },
        { role: "sent", totalThreads: 9 },
        { role: "drafts", totalEmails: 2 },
        { role: "junk", totalThreads: 1 },
        { role: "trash", totalThreads: 3 },
        { role: "archive", totalThreads: 12 },
        { role: null, totalThreads: 40 },
      ],
      4,
    ),
    {
      inbox: 18,
      smart: 5,
      starred: 4,
      sent: 9,
      drafts: 2,
      spam: 1,
      trash: 3,
      archived: 12,
    },
  );
});

test("defaults missing system mailboxes to zero", () => {
  assert.deepEqual(stalwartFolderCounts([], 0), {
    inbox: 0,
    smart: 0,
    starred: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0,
    archived: 0,
  });
});
