import assert from "node:assert/strict";
import test from "node:test";
import { createUserPreferencesStore } from "./user-preferences-store.ts";

const dark = {
  theme: "dark",
  density: "comfortable",
  loadRemoteImages: true,
  includeRedaktFooter: true,
  singleKeyShortcuts: true,
  messagePreview: "one",
};

const light = { ...dark, theme: "light" };

test("shares preference updates between cached shells for the same user", () => {
  const store = createUserPreferencesStore();
  let notifications = 0;
  const unsubscribe = store.subscribe("user-1", () => {
    notifications += 1;
  });

  assert.strictEqual(store.getSnapshot("user-1", dark), dark);
  store.set("user-1", light);

  assert.strictEqual(store.getSnapshot("user-1", dark), light);
  assert.equal(notifications, 1);
  unsubscribe();
});

test("keeps preference snapshots scoped to their session user", () => {
  const store = createUserPreferencesStore();
  const system = { ...dark, theme: "system" };

  store.getSnapshot("user-1", dark);
  store.getSnapshot("user-2", system);
  store.set("user-1", light);

  assert.strictEqual(store.getSnapshot("user-1", dark), light);
  assert.strictEqual(store.getSnapshot("user-2", dark), system);
});
