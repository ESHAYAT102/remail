import assert from "node:assert/strict";
import test from "node:test";
import { describeUserAgent } from "./security.ts";

test("describes common browsers without exposing the full user-agent", () => {
  assert.equal(
    describeUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
    ),
    "Chrome on macOS",
  );
  assert.equal(
    describeUserAgent("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1"),
    "Safari on iOS",
  );
  assert.equal(describeUserAgent(), "Unknown browser");
});
