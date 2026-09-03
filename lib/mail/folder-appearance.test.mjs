import assert from "node:assert/strict";
import test from "node:test";
import { folderToneForSeed, folderTones } from "./folder-appearance.ts";

test("assigns folders a stable category tone", () => {
  assert.equal(folderToneForSeed("Label_Projects"), "rose");
  assert.equal(folderToneForSeed("Label_Projects"), "rose");
  assert.equal(folderToneForSeed(""), "neutral");
  assert.ok(folderTones.includes(folderToneForSeed("mailbox-42")));
});
