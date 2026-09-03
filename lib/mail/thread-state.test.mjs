import assert from "node:assert/strict";
import test from "node:test";
import {
  persistThreadArchive,
  persistThreadCollection,
  persistThreadMove,
  persistThreadStarred,
  persistThreadUnread,
} from "./thread-state.ts";

test("persistThreadUnread sends a persisted thread-state mutation", async () => {
  let request;
  await persistThreadUnread("account/one", "thread/with space", false, async (url, init) => {
    request = { url, init };
    return new Response(null, { status: 200 });
  });

  assert.equal(
    request.url,
    "/api/mail/threads/thread%2Fwith%20space?account=account%2Fone",
  );
  assert.equal(request.init.method, "PATCH");
  assert.equal(request.init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.init.body), { unread: false });
});

test("persists provider-neutral folder and label mutations", async () => {
  let body;
  await persistThreadCollection(
    "account",
    "thread-1",
    "Label_42",
    true,
    "inbox",
    async (_url, init) => {
      body = JSON.parse(init.body);
      return new Response(null, { status: 200 });
    },
  );

  assert.deepEqual(body, {
    action: "collection",
    collectionId: "Label_42",
    selected: true,
    fromFolder: "inbox",
  });
});

test("persistThreadUnread rejects failed mutations", async () => {
  await assert.rejects(
    persistThreadUnread("account", "missing", true, async () =>
      new Response(null, { status: 404 }),
    ),
    /Unable to update this thread/,
  );
});

test("persistThreadArchive identifies the source mailbox", async () => {
  let body;
  await persistThreadArchive("account", "thread-1", "inbox", async (_url, init) => {
    body = JSON.parse(init.body);
    return new Response(null, { status: 200 });
  });

  assert.deepEqual(body, { action: "archive", fromFolder: "inbox" });
});

test("persists provider-neutral star and move mutations", async () => {
  const requests = [];
  const request = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return new Response(null, { status: 200 });
  };
  await persistThreadStarred("account", "thread-1", true, request);
  await persistThreadMove("account", "thread-1", "spam", "archived", request);
  assert.deepEqual(requests.map((item) => item.body), [
    { action: "star", starred: true },
    { action: "move", destination: "spam", fromFolder: "archived" },
  ]);
});
