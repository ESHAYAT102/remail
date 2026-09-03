import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionTerm,
  folderCollectionTransfer,
  normalizeCollectionName,
} from "./collections.ts";

test("normalizes collection names without changing meaningful punctuation", () => {
  assert.equal(normalizeCollectionName("  Project   A / 2026  "), "Project A / 2026");
  assert.equal(normalizeCollectionName(""), null);
  assert.equal(normalizeCollectionName(" ".repeat(80)), null);
  assert.equal(normalizeCollectionName("a".repeat(65)), null);
});

test("uses connector-appropriate collection terms", () => {
  assert.equal(collectionTerm("folder"), "folder");
  assert.equal(collectionTerm("label"), "label");
});

test("moves folder mail back to Inbox when the folder is removed", () => {
  assert.deepEqual(
    folderCollectionTransfer("projects", true, "archived"),
    {
      source: "archived",
      destination: "collection:projects",
    },
  );
  assert.deepEqual(
    folderCollectionTransfer("projects", false, "collection:projects"),
    {
      source: "collection:projects",
      destination: "inbox",
    },
  );
});
