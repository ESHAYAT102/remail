import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureWorkspaceTab,
  folderHrefFromWorkspaceTab,
  mergeWorkspaceTabs,
  parseWorkspaceTabs,
  pinSettingsWorkspaceTab,
  reorderWorkspaceTabs,
  serializeWorkspaceTabs,
  workspaceTabIdsToClose,
} from "./workspace-tabs.ts";

const design = {
  id: "thread:account_1:thr_design",
  kind: "thread",
  title: "Review: tab connectors",
  href: "/mail/a/account_1/inbox/thread/thr_design?q=review",
  threadId: "thr_design",
  unread: false,
};

const other = {
  id: "thread:account_1:thr_other",
  kind: "thread",
  title: "Another thread",
  href: "/mail/a/account_1/sent/thread/thr_other",
  threadId: "thr_other",
  unread: true,
};

const settings = {
  id: "settings",
  kind: "settings",
  title: "Settings",
  href: "/mail/settings/domains",
};

test("round trips persistent conversation and settings tabs", () => {
  assert.deepEqual(parseWorkspaceTabs(serializeWorkspaceTabs([design, settings])), [
    design,
    settings,
  ]);
});

test("rejects corrupt, external, and non-restorable tab entries", () => {
  const unsafe = JSON.stringify([
    design,
    { ...design, id: "thread:wrong" },
    { ...design, href: "//example.com/mail/inbox/thread/thr_design" },
    { id: "folder", kind: "folder", title: "Inbox", href: "/mail/inbox" },
  ]);

  assert.deepEqual(parseWorkspaceTabs(unsafe), [design]);
  assert.deepEqual(parseWorkspaceTabs("not json"), []);
});

test("keeps restored order while refreshing tabs already open", () => {
  const updated = { ...design, title: "Updated subject" };

  assert.deepEqual(mergeWorkspaceTabs([design], [updated, other]), [
    updated,
    other,
  ]);
});

test("an active route fallback neither replaces nor moves a resolved tab", () => {
  const fallback = { ...design, title: "Conversation" };

  assert.deepEqual(ensureWorkspaceTab([other, design], fallback), [other, design]);
  assert.deepEqual(ensureWorkspaceTab([other], fallback), [other, fallback]);
});

test("pins settings ahead of conversation tabs without reordering them", () => {
  assert.deepEqual(pinSettingsWorkspaceTab([design, settings, other]), [
    settings,
    design,
    other,
  ]);
  assert.deepEqual(pinSettingsWorkspaceTab([settings, other, design]), [
    settings,
    other,
    design,
  ]);
});

test("reorders conversation tabs without moving fixed tabs", () => {
  const tabs = [settings, design, other];

  assert.deepEqual(reorderWorkspaceTabs(tabs, other.id, design.id, "before"), [
    settings,
    other,
    design,
  ]);
  assert.deepEqual(reorderWorkspaceTabs(tabs, design.id, other.id, "after"), [
    settings,
    other,
    design,
  ]);
  assert.strictEqual(
    reorderWorkspaceTabs(tabs, design.id, settings.id, "before"),
    tabs,
  );
});

test("selects closable tabs for every context menu action", () => {
  const read = {
    ...design,
    id: "thread:account_1:thr_read",
    href: "/mail/a/account_1/inbox/thread/thr_read",
    threadId: "thr_read",
  };
  const folder = {
    id: "folder",
    kind: "folder",
    title: "Inbox",
    href: "/mail/a/account_1/inbox",
  };
  const tabs = [folder, settings, design, other, read];

  assert.deepEqual(workspaceTabIdsToClose(tabs, design.id, "tab"), [design.id]);
  assert.deepEqual(workspaceTabIdsToClose(tabs, design.id, "others"), [
    settings.id,
    other.id,
    read.id,
  ]);
  assert.deepEqual(workspaceTabIdsToClose(tabs, design.id, "all"), [
    settings.id,
    design.id,
    other.id,
    read.id,
  ]);
  assert.deepEqual(workspaceTabIdsToClose(tabs, design.id, "right"), [
    other.id,
    read.id,
  ]);
  assert.deepEqual(workspaceTabIdsToClose(tabs, design.id, "read"), [
    design.id,
    read.id,
  ]);
  assert.deepEqual(workspaceTabIdsToClose(tabs, folder.id, "tab"), []);
});

test("bounds the live workspace to the same limit as persisted tabs", () => {
  const tabs = Array.from({ length: 31 }, (_, index) => ({
    id: `thread:account_1:thr_${index}`,
    kind: "thread",
    title: `Thread ${index}`,
    href: `/mail/a/account_1/inbox/thread/thr_${index}`,
    threadId: `thr_${index}`,
  }));

  const merged = mergeWorkspaceTabs(tabs.slice(0, 30), [tabs[30]]);

  assert.equal(merged.length, 30);
  assert.equal(merged[0].id, "thread:account_1:thr_1");
  assert.equal(merged.at(-1)?.id, "thread:account_1:thr_30");
});

test("returns to the source folder without dropping its list query", () => {
  assert.equal(
    folderHrefFromWorkspaceTab(design, "sent", "account_1"),
    "/mail/a/account_1/inbox?q=review",
  );
  assert.equal(
    folderHrefFromWorkspaceTab(undefined, "sent", "account_1"),
    "/mail/a/account_1/sent",
  );
  assert.equal(
    folderHrefFromWorkspaceTab(
      {
        ...design,
        href: "/mail/a/account_1/collection%3ALabel_42/thread/thr_design?q=review",
      },
      "inbox",
      "account_1",
    ),
    "/mail/a/account_1/collection%3ALabel_42?q=review",
  );
});
