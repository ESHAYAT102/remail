import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultUserPreferences,
  normalizeUserPreferences,
  parseUserPreferencesPatch,
} from "./preferences.ts";
import { DEFAULT_KEYBINDS } from "./mail/keybinds.ts";

test("uses stable defaults for absent or invalid stored preferences", () => {
  assert.deepEqual(normalizeUserPreferences(), defaultUserPreferences);
  assert.deepEqual(
    normalizeUserPreferences({ theme: "sepia", density: "tiny" }),
    defaultUserPreferences,
  );
});

test("accepts a partial preference update without filling omitted values", () => {
  assert.deepEqual(parseUserPreferencesPatch({ theme: "dark" }), {
    theme: "dark",
  });
  assert.deepEqual(
    parseUserPreferencesPatch({ defaultSenderAlias: "  Hello  " }),
    { defaultSenderAlias: "hello" },
  );
  assert.deepEqual(
    parseUserPreferencesPatch({
      loadRemoteImages: false,
      includeRedaktFooter: false,
      singleKeyShortcuts: false,
      messagePreview: "two",
    }),
    {
      loadRemoteImages: false,
      includeRedaktFooter: false,
      singleKeyShortcuts: false,
      messagePreview: "two",
    },
  );
});

test("rejects unknown, empty, or invalid setting updates", () => {
  assert.throws(() => parseUserPreferencesPatch({}), /setting/i);
  assert.throws(() => parseUserPreferencesPatch({ theme: "sepia" }), /theme/i);
  assert.throws(
    () => parseUserPreferencesPatch({ includeRedaktFooter: "yes" }),
    /footer/i,
  );
  assert.throws(
    () => parseUserPreferencesPatch({ theme: "dark", extra: true }),
    /setting/i,
  );
  assert.throws(
    () => parseUserPreferencesPatch({ defaultSenderAlias: "hello@example.com" }),
    /@ sign/i,
  );
});

test("normalizes and validates keybind updates", () => {
  const keybinds = {
    ...DEFAULT_KEYBINDS,
    newEmail: [
      { key: "X", ctrl: true, alt: false, shift: false, meta: false },
    ],
  };
  assert.deepEqual(parseUserPreferencesPatch({ keybinds }).keybinds.newEmail, [
    { key: "x", ctrl: true, alt: false, shift: false, meta: false },
  ]);
  assert.throws(
    () => parseUserPreferencesPatch({ keybinds: { newEmail: [{ key: "" }] } }),
    /shortcuts/i,
  );
});
