import assert from "node:assert/strict";
import test from "node:test";
import { collectFolderCounts } from "./folder-counts.ts";

test("collectFolderCounts uses total threads for every sidebar view", async () => {
  const totals = {
    inbox: [18, 5],
    smart: [5, 5],
    starred: [4, 0],
    sent: [9, 0],
    drafts: [2, 0],
    spam: [1, 1],
    trash: [3, 0],
    archived: [12, 0],
  };
  const calls = [];
  const provider = {
    async listThreads(folder, query) {
      calls.push([folder, query]);
      const [total, unread] = totals[folder];
      return { threads: [], total, unread, hasMore: false };
    },
  };

  assert.deepEqual(await collectFolderCounts(provider), {
    inbox: 18,
    smart: 5,
    starred: 4,
    sent: 9,
    drafts: 2,
    spam: 1,
    trash: 3,
    archived: 12,
  });
  assert.equal(calls.length, 8);
  assert.ok(calls.every(([, query]) => query.limit === 1 && query.offset === 0));
});

test("collectFolderCounts does not fan out provider requests", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const provider = {
    async listThreads() {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return { threads: [], total: 0, unread: 0, hasMore: false };
    },
  };

  await collectFolderCounts(provider);
  assert.equal(maxInFlight, 1);
});
