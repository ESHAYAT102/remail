import assert from "node:assert/strict";
import test from "node:test";
import {
  collectThreadSelectionTargets,
  toggleAllThreadSelection,
  updateThreadSelection,
} from "./thread-selection.ts";

const orderedIds = ["alpha", "bravo", "charlie", "delta", "echo"];

function sorted(values) {
  return [...values].sort();
}

test("toggles individual threads and advances the range anchor", () => {
  const first = updateThreadSelection(
    orderedIds,
    new Set(),
    "bravo",
    null,
    false,
  );
  assert.deepEqual(sorted(first.selectedIds), ["bravo"]);
  assert.equal(first.anchorId, "bravo");

  const second = updateThreadSelection(
    orderedIds,
    first.selectedIds,
    "delta",
    first.anchorId,
    false,
  );
  assert.deepEqual(sorted(second.selectedIds), ["bravo", "delta"]);
  assert.equal(second.anchorId, "delta");

  const third = updateThreadSelection(
    orderedIds,
    second.selectedIds,
    "bravo",
    second.anchorId,
    false,
  );
  assert.deepEqual(sorted(third.selectedIds), ["delta"]);
  assert.equal(third.anchorId, "bravo");
});

test("adds an inclusive forward range from the latest anchor", () => {
  const result = updateThreadSelection(
    orderedIds,
    new Set(["alpha", "charlie"]),
    "echo",
    "charlie",
    true,
  );

  assert.deepEqual(sorted(result.selectedIds), [
    "alpha",
    "charlie",
    "delta",
    "echo",
  ]);
  assert.equal(result.anchorId, "charlie");
});

test("adds reverse ranges and preserves earlier individual selections", () => {
  const result = updateThreadSelection(
    orderedIds,
    new Set(["echo"]),
    "bravo",
    "delta",
    true,
  );

  assert.deepEqual(sorted(result.selectedIds), [
    "bravo",
    "charlie",
    "delta",
    "echo",
  ]);
  assert.equal(result.anchorId, "delta");
});

test("starts a new range anchor when the previous anchor is not visible", () => {
  const result = updateThreadSelection(
    orderedIds,
    new Set(["outside"]),
    "charlie",
    "outside",
    true,
  );

  assert.deepEqual(sorted(result.selectedIds), ["charlie"]);
  assert.equal(result.anchorId, "charlie");
});

test("collects all, unread, and starred selection targets", () => {
  const targets = collectThreadSelectionTargets([
    { id: "alpha", folder: "inbox", unread: true },
    { id: "bravo", folder: "inbox", unread: false, favorite: true },
    {
      id: "charlie",
      folder: "inbox",
      unread: true,
      favorite: true,
      collectionIds: ["team"],
    },
  ]);

  assert.deepEqual(targets, {
    allIds: ["alpha", "bravo", "charlie"],
    unreadIds: ["alpha", "charlie"],
    starredIds: ["bravo", "charlie"],
    items: [
      {
        id: "alpha",
        folder: "inbox",
        unread: true,
        collectionIds: undefined,
      },
      {
        id: "bravo",
        folder: "inbox",
        unread: false,
        favorite: true,
        collectionIds: undefined,
      },
      {
        id: "charlie",
        folder: "inbox",
        unread: true,
        favorite: true,
        collectionIds: ["team"],
      },
    ],
  });
});

test("master selection fills a partial set and clears a complete set", () => {
  assert.deepEqual(
    sorted(toggleAllThreadSelection(orderedIds, new Set(["alpha"]))),
    sorted(orderedIds),
  );
  assert.deepEqual(
    sorted(toggleAllThreadSelection(orderedIds, new Set(orderedIds))),
    [],
  );
});
