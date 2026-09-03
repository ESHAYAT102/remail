import assert from "node:assert/strict";
import test from "node:test";
import {
  createGmailWatch,
  isGmailReauthorizationError,
  readGmailHistory,
} from "./sync-core.ts";

function apiError(status) {
  return Object.assign(new Error(`Google API failed (${status})`), { status });
}

test("advances a Gmail history cursor across every page", async () => {
  const calls = [];
  const pages = [
    {
      history: [{ id: "101" }],
      historyId: "110",
      nextPageToken: "next",
    },
    { history: [], historyId: "120" },
  ];
  const result = await readGmailHistory(
    {
      getProfile: async () => ({ historyId: "unused" }),
      listHistory: async (cursor, pageToken) => {
        calls.push([cursor, pageToken]);
        return pages.shift();
      },
    },
    "100",
  );
  assert.deepEqual(calls, [
    ["100", undefined],
    ["100", "next"],
  ]);
  assert.deepEqual(result, { cursor: "120", changed: true });
});

for (const status of [404, 410]) {
  test(`falls back to a full refresh for an expired ${status} cursor`, async () => {
    const result = await readGmailHistory(
      {
        getProfile: async () => ({ historyId: "current" }),
        listHistory: async () => {
          throw apiError(status);
        },
      },
      "expired",
    );
    assert.deepEqual(result, { cursor: "current", changed: true });
  });
}

test("propagates Gmail history failures that cannot be recovered", async () => {
  await assert.rejects(
    readGmailHistory(
      {
        getProfile: async () => ({ historyId: "current" }),
        listHistory: async () => {
          throw apiError(500);
        },
      },
      "100",
    ),
    (error) => error.status === 500,
  );
});

test("classifies revoked and insufficient Gmail grants for reauthorization", () => {
  assert.equal(isGmailReauthorizationError(apiError(401)), true);
  assert.equal(isGmailReauthorizationError(apiError(403)), true);
  assert.equal(isGmailReauthorizationError(apiError(429)), false);
});

test("validates and converts Gmail watch expirations", async () => {
  const watch = await createGmailWatch(
    {
      watch: async (topicName) => {
        assert.equal(topicName, "projects/redakt/topics/gmail");
        return { historyId: "200", expiration: "1893456000000" };
      },
    },
    "projects/redakt/topics/gmail",
  );
  assert.equal(watch.historyId, "200");
  assert.equal(watch.expiresAt.toISOString(), "2030-01-01T00:00:00.000Z");

  await assert.rejects(
    createGmailWatch(
      {
        watch: async () => ({ historyId: "200", expiration: "invalid" }),
      },
      "projects/redakt/topics/gmail",
    ),
    /invalid watch expiration/,
  );
});
