import assert from "node:assert/strict";
import test from "node:test";
import {
  parseThreadDropTargetKey,
  threadDropTargetKey,
} from "./thread-drag.ts";

test("round trips collection and system thread drop targets", () => {
  const targets = [
    { type: "collection", collectionId: "projects:launch" },
    { type: "archive" },
    { type: "unread" },
    { type: "move", destination: "inbox" },
    { type: "move", destination: "spam" },
    { type: "move", destination: "trash" },
  ];

  for (const target of targets) {
    assert.deepEqual(
      parseThreadDropTargetKey(threadDropTargetKey(target)),
      target,
    );
  }
});

test("rejects empty and unsupported thread drop targets", () => {
  assert.equal(parseThreadDropTargetKey(undefined), null);
  assert.equal(parseThreadDropTargetKey("collection:"), null);
  assert.equal(parseThreadDropTargetKey("move:sent"), null);
});
