import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionIdFromView,
  collectionViewId,
  folderTitle,
  isMailFolder,
  isKnownMailView,
  isMailView,
  mailFolderHref,
  mailRouteFromPathname,
  mailSettingsHref,
  mailThreadHref,
  mailViewFromSegment,
} from "./routes.ts";

test("recognizes only folders exposed by the mail navigation", () => {
  assert.equal(isMailFolder("inbox"), true);
  assert.equal(isMailFolder("smart"), true);
  assert.equal(isMailFolder("starred"), true);
  assert.equal(isMailFolder("trash"), true);
  assert.equal(isMailFolder("scheduled"), false);
  assert.equal(isMailFolder("settings"), false);
});

test("builds and recognizes custom collection views", () => {
  const view = collectionViewId("Label/Project A");
  const collections = [
    { id: "Label/Project A", name: "Project A", kind: "label" },
  ];

  assert.equal(view, "collection:Label/Project A");
  assert.equal(collectionIdFromView(view), "Label/Project A");
  assert.equal(isMailView(view), true);
  assert.equal(isMailFolder(view), false);
  assert.equal(isKnownMailView(view, collections), true);
  assert.equal(folderTitle(view, collections), "Project A");
  assert.equal(
    mailViewFromSegment("collection%3ALabel%2FProject%20A"),
    view,
  );
  assert.equal(
    mailFolderHref(view, undefined, "hosted/account"),
    "/mail/a/hosted%2Faccount/collection%3ALabel%2FProject%20A",
  );
  assert.deepEqual(
    mailRouteFromPathname(
      "/mail/a/hosted%2Faccount/collection%3ALabel%2FProject%20A",
    ),
    {
      kind: "folder",
      accountId: "hosted/account",
      folder: view,
    },
  );
  assert.equal(
    mailThreadHref(view, "thread/one", undefined, "hosted/account"),
    "/mail/a/hosted%2Faccount/collection%3ALabel%2FProject%20A/thread/thread%2Fone",
  );
});

test("builds stable folder and conversation URLs with list state", () => {
  const query = { q: "design review", unread: true, sort: "from", order: "asc" };

  assert.equal(
    mailFolderHref("inbox", query),
    "/mail/inbox?q=design+review&unread=1&sort=from&order=asc",
  );
  assert.equal(
    mailThreadHref("inbox", "thread/with slash", query),
    "/mail/inbox/thread/thread%2Fwith%20slash?q=design+review&unread=1&sort=from&order=asc",
  );
  assert.equal(
    mailFolderHref("inbox", query, "hosted/account"),
    "/mail/a/hosted%2Faccount/inbox?q=design+review&unread=1&sort=from&order=asc",
  );
  assert.equal(
    mailThreadHref("inbox", "thread/with slash", query, "hosted/account"),
    "/mail/a/hosted%2Faccount/inbox/thread/thread%2Fwith%20slash?q=design+review&unread=1&sort=from&order=asc",
  );
});

test("parses folder, conversation, and settings routes", () => {
  assert.deepEqual(mailRouteFromPathname("/mail/sent"), {
    kind: "folder",
    accountId: null,
    folder: "sent",
  });
  assert.deepEqual(mailRouteFromPathname("/mail/inbox/thread/thread%2Fone"), {
    kind: "thread",
    accountId: null,
    folder: "inbox",
    threadId: "thread/one",
  });
  assert.deepEqual(mailRouteFromPathname("/mail/settings/domain"), {
    kind: "settings",
    section: "account",
  });
  assert.deepEqual(mailRouteFromPathname("/mail/settings/appearance"), {
    kind: "settings",
    section: "appearance",
  });
  assert.equal(mailSettingsHref("security"), "/mail/settings/security");
  assert.deepEqual(
    mailRouteFromPathname(
      "/mail/a/hosted%2Faccount/inbox/thread/thread%2Fone",
    ),
    {
      kind: "thread",
      accountId: "hosted/account",
      folder: "inbox",
      threadId: "thread/one",
    },
  );
  assert.deepEqual(mailRouteFromPathname("/mail/settings/accounts"), {
    kind: "settings",
    section: "account",
  });
  assert.equal(mailRouteFromPathname("/mail/settings/unknown"), null);
  assert.equal(mailRouteFromPathname("/mail/scheduled"), null);
  assert.equal(mailRouteFromPathname("/mail/inbox/unknown"), null);
});
