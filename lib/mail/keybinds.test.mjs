import assert from "node:assert/strict";
import test from "node:test";
import {
  comboMatchesEvent,
  DEFAULT_KEYBINDS,
  formatKeyCombo,
  keybindMatchesEvent,
  normalizeKeybinds,
} from "./keybinds.ts";

test("fills missing and invalid keybinds with stable defaults", () => {
  assert.deepEqual(normalizeKeybinds(), DEFAULT_KEYBINDS);
  assert.deepEqual(
    normalizeKeybinds({ newEmail: { key: "X" } }).newEmail,
    [{ key: "x", ctrl: false, alt: false, shift: false, meta: false }],
  );
  assert.deepEqual(
    normalizeKeybinds({ newEmail: { key: "" } }).newEmail,
    DEFAULT_KEYBINDS.newEmail,
  );
});

test("matches exact modifiers and accepts Cmd for Ctrl defaults", () => {
  const event = (overrides = {}) => ({
    key: "c",
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  });

  assert.equal(keybindMatchesEvent(event(), DEFAULT_KEYBINDS.newEmail), true);
  assert.equal(
    keybindMatchesEvent(event({ shiftKey: true }), DEFAULT_KEYBINDS.newEmail),
    false,
  );
  assert.equal(
    comboMatchesEvent(
      event({ key: ",", metaKey: true }),
      DEFAULT_KEYBINDS.openSettings[0],
    ),
    true,
  );
});

test("formats readable shortcut labels", () => {
  assert.equal(formatKeyCombo(DEFAULT_KEYBINDS.toggleSelect[0]), "Space");
  assert.equal(formatKeyCombo(DEFAULT_KEYBINDS.openSettings[0]), "Ctrl/⌘ + ,");
});

test("includes editable alternate defaults", () => {
  assert.deepEqual(
    DEFAULT_KEYBINDS.newEmail.map(formatKeyCombo),
    ["C", "Alt + N"],
  );
  assert.deepEqual(DEFAULT_KEYBINDS.toggleTheme.map(formatKeyCombo), ["T"]);
  assert.deepEqual(DEFAULT_KEYBINDS.showShortcuts.map(formatKeyCombo), ["Ctrl/⌘ + K"]);
  assert.deepEqual(DEFAULT_KEYBINDS.toggleSelectAll.map(formatKeyCombo), [
    "Ctrl/⌘ + A",
  ]);
  assert.deepEqual(
    DEFAULT_KEYBINDS.prevTab.map(formatKeyCombo),
    ["H", "←"],
  );
  assert.deepEqual(
    DEFAULT_KEYBINDS.moveNext.map(formatKeyCombo),
    ["J", "↓"],
  );
});
