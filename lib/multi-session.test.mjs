import assert from "node:assert/strict";
import test from "node:test";
import { betterAuth } from "better-auth";
import { multiSession } from "better-auth/plugins";
import { MAX_DEVICE_ACCOUNTS } from "./auth-policy.ts";
import { preserveCurrentSession } from "./preserve-current-session.ts";

class CookieJar {
  #cookies = new Map();

  apply(response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (attributes.some((part) => part.trim().toLowerCase() === "max-age=0")) {
        this.#cookies.delete(name);
      } else {
        this.#cookies.set(name, value);
      }
    }
  }

  deleteMatching(fragment) {
    for (const name of this.#cookies.keys()) {
      if (name.includes(fragment)) this.#cookies.delete(name);
    }
  }

  header() {
    return [...this.#cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

test("preserves a pre-plugin session and switches between device accounts", async () => {
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "redakt-multi-session-test-secret-2026-09-03",
    emailAndPassword: { enabled: true },
    plugins: [
      multiSession({ maximumSessions: MAX_DEVICE_ACCOUNTS }),
      preserveCurrentSession(),
    ],
  });
  const jar = new CookieJar();

  async function request(path, body, method = body ? "POST" : "GET") {
    const response = await auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method,
        headers: {
          origin: "http://localhost:3000",
          ...(body ? { "content-type": "application/json" } : {}),
          ...(jar.header() ? { cookie: jar.header() } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    jar.apply(response);
    return response;
  }

  const alice = await request("/sign-up/email", {
    email: "alice@example.com",
    password: "password123",
    name: "Alice",
  });
  assert.equal(alice.status, 200);

  // Simulate a session issued before multi-session was deployed.
  jar.deleteMatching("_multi-");
  const preserve = await request("/multi-session/preserve-current", {});
  assert.equal(preserve.status, 200);

  const bob = await request("/sign-up/email", {
    email: "bob@example.com",
    password: "password123",
    name: "Bob",
  });
  assert.equal(bob.status, 200);

  const list = await request("/multi-session/list-device-sessions");
  assert.equal(list.status, 200);
  const sessions = await list.json();
  assert.deepEqual(
    sessions.map((item) => item.user.email).sort(),
    ["alice@example.com", "bob@example.com"],
  );

  const aliceSession = sessions.find(
    (item) => item.user.email === "alice@example.com",
  );
  const switched = await request("/multi-session/set-active", {
    sessionToken: aliceSession.session.token,
  });
  assert.equal(switched.status, 200);

  const current = await request("/get-session");
  assert.equal(current.status, 200);
  assert.equal((await current.json()).user.email, "alice@example.com");
});
