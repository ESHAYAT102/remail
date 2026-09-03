import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionColorOptions,
  collectionIconOptions,
  defaultCollectionAppearance,
  normalizeCollectionColor,
  normalizeCollectionIcon,
} from "./collection-appearance.ts";

test("exposes a bounded set of 32 collection icons", () => {
  assert.equal(collectionIconOptions.length, 32);
  assert.equal(normalizeCollectionIcon("sparkles"), "sparkles");
  assert.equal(normalizeCollectionIcon("unknown"), null);
});

test("accepts six-digit hex colors and normalizes their case", () => {
  assert.equal(normalizeCollectionColor("#A0b1C2"), "#a0b1c2");
  assert.equal(normalizeCollectionColor("#fff"), null);
  assert.equal(normalizeCollectionColor("red"), null);
});

test("uses the gray preset as the default folder appearance", () => {
  assert.equal(defaultCollectionAppearance.color, "#858b94");
  assert.equal(collectionColorOptions.length, 15);
  assert.ok(
    collectionColorOptions.some(
      (option) => option.value === defaultCollectionAppearance.color,
    ),
  );
});
