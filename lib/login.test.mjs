import assert from "node:assert/strict";
import test from "node:test";
import { getInitialLoginFields } from "./login.ts";

test("production login fields start empty", () => {
  assert.deepEqual(getInitialLoginFields(false), { email: "", password: "" });
});

test("demo mode keeps the documented seed login", () => {
  assert.deepEqual(getInitialLoginFields(true), {
    email: "ada@redakt.local",
    password: "demo",
  });
});
