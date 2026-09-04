import assert from "node:assert/strict";
import test from "node:test";
import { areGoogleCtasEnabled, getAppUrl } from "./env.ts";

function withEnvironment(values, run) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("requires a canonical app origin in live mode", () => {
  withEnvironment(
    { DEMO_MODE: "false", BETTER_AUTH_URL: undefined },
    () => assert.throws(() => getAppUrl(), /is required/),
  );
  withEnvironment(
    {
      DEMO_MODE: "false",
      BETTER_AUTH_URL: "https://redakt-staging.up.railway.app/callback",
    },
    () => assert.throws(() => getAppUrl(), /without a path/),
  );
});

test("normalizes configured origins and keeps the demo-only local default", () => {
  withEnvironment(
    {
      DEMO_MODE: "false",
      BETTER_AUTH_URL: "https://redakt-staging.up.railway.app/",
    },
    () =>
      assert.equal(
        getAppUrl(),
        "https://redakt-staging.up.railway.app",
      ),
  );
  withEnvironment(
    { DEMO_MODE: undefined, BETTER_AUTH_URL: undefined },
    () => assert.equal(getAppUrl(), "http://localhost:3000"),
  );
});

test("enables Google sign-in whenever its credentials are configured", () => {
  const credentials = {
    DEMO_MODE: "false",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
  };

  withEnvironment(
    { ...credentials, BETTER_AUTH_URL: "https://redakt.app" },
    () => assert.equal(areGoogleCtasEnabled(), true),
  );
  withEnvironment(
    {
      ...credentials,
      BETTER_AUTH_URL: "https://redakt-staging.up.railway.app",
    },
    () => assert.equal(areGoogleCtasEnabled(), true),
  );
  withEnvironment(
    {
      ...credentials,
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_SECRET: undefined,
    },
    () => assert.equal(areGoogleCtasEnabled(), false),
  );
});
