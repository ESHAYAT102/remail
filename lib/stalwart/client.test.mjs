import assert from "node:assert/strict";
import test from "node:test";
import { StalwartClient } from "./client.ts";

test("creates a custom mailbox without assigning a system role", async (context) => {
  let create;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, args, callId] = JSON.parse(String(init.body)).methodCalls[0];
    create = args.create.mailbox1;
    return Response.json({
      methodResponses: [
        [method, { created: { mailbox1: { id: "mailbox-1" } } }, callId],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  assert.equal(await client.createMailbox("account-1", "Projects"), "mailbox-1");
  assert.deepEqual(create, { name: "Projects" });
});

test("renames and deletes a custom JMAP mailbox", async (context) => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, args, callId] = JSON.parse(String(init.body)).methodCalls[0];
    calls.push([method, args]);
    return Response.json({
      methodResponses: [
        [
          method,
          args.update
            ? { updated: { "mailbox-1": null } }
            : { destroyed: ["mailbox-1"] },
          callId,
        ],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  assert.equal(
    await client.renameMailbox("account-1", "mailbox-1", "Clients"),
    true,
  );
  assert.equal(await client.deleteMailbox("account-1", "mailbox-1"), true);
  assert.deepEqual(calls, [
    [
      "Mailbox/set",
      {
        accountId: "account-1",
        update: { "mailbox-1": { name: "Clients" } },
      },
    ],
    [
      "Mailbox/set",
      { accountId: "account-1", destroy: ["mailbox-1"] },
    ],
  ]);
});

test("moves emails between JMAP mailboxes with patch paths", async (context) => {
  let update;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, args, callId] = JSON.parse(String(init.body)).methodCalls[0];
    update = args.update;
    return Response.json({
      methodResponses: [[method, { updated: { "email-1": null } }, callId]],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  assert.equal(
    await client.moveEmails(
      "account-1",
      ["email-1"],
      "inbox-1",
      "projects-1",
    ),
    true,
  );
  assert.deepEqual(update, {
    "email-1": {
      "mailboxIds/inbox-1": null,
      "mailboxIds/projects-1": true,
    },
  });
});

test("can query every email in a mailbox without collapsing threads", async (context) => {
  let query;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, args, callId] = JSON.parse(String(init.body)).methodCalls[0];
    query = args;
    return Response.json({
      methodResponses: [[method, { ids: [], total: 0 }, callId]],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  await client.queryEmails("account-1", {
    mailboxId: "projects-1",
    collapseThreads: false,
    limit: 100,
  });
  assert.equal(query.collapseThreads, false);
  assert.equal(query.limit, 100);
  assert.deepEqual(query.filter, { inMailbox: "projects-1" });
});

test("deduplicates concurrent session and mailbox discovery requests", async (context) => {
  let sessionRequests = 0;
  let mailboxRequests = 0;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      sessionRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 1));
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    mailboxRequests += 1;
    return Response.json({
      methodResponses: [
        ["Mailbox/query", { ids: ["inbox-1"] }, "c1"],
        [
          "Mailbox/get",
          { list: [{ id: "inbox-1", role: "inbox" }] },
          "c2",
        ],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  const [left, right] = await Promise.all([
    client.listMailboxes("account-1"),
    client.listMailboxes("account-1"),
  ]);

  assert.deepEqual(left, right);
  assert.equal(sessionRequests, 1);
  assert.equal(mailboxRequests, 1);
});

test("batches page, summaries, and unread count in one JMAP request", async (context) => {
  let methodCalls;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    methodCalls = JSON.parse(String(init.body)).methodCalls;
    return Response.json({
      methodResponses: [
        ["Email/query", { ids: ["email-1"], total: 2 }, "page"],
        ["Email/get", { list: [{ id: "email-1" }] }, "emails"],
        ["Email/query", { ids: ["email-1"], total: 1 }, "unread"],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  const result = await client.listEmails("account-1", {
    mailboxId: "inbox-1",
    keyword: "$flagged",
    limit: 20,
  });

  assert.equal(methodCalls.length, 3);
  assert.deepEqual(methodCalls[1][1]["#ids"], {
    resultOf: "page",
    name: "Email/query",
    path: "/ids",
  });
  assert.ok(!methodCalls[1][1].properties.includes("bodyValues"));
  assert.deepEqual(methodCalls[2][1].filter, {
    operator: "AND",
    conditions: [
      { inMailbox: "inbox-1" },
      { notKeyword: "$seen" },
      { hasKeyword: "$flagged" },
    ],
  });
  assert.equal(result.page.total, 2);
  assert.equal(result.unread.total, 1);
  assert.deepEqual(result.emails.list, [{ id: "email-1" }]);
});

test("batches thread lookup and message hydration", async (context) => {
  let methodCalls;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    methodCalls = JSON.parse(String(init.body)).methodCalls;
    return Response.json({
      methodResponses: [
        ["Thread/get", { list: [{ emailIds: ["email-1"] }] }, "thread"],
        ["Email/get", { list: [{ id: "email-1" }] }, "emails"],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "user", "secret");
  assert.deepEqual(await client.getThreadEmails("account-1", "thread-1"), {
    list: [{ id: "email-1" }],
  });
  assert.equal(methodCalls.length, 2);
  assert.deepEqual(methodCalls[1][1]["#ids"], {
    resultOf: "thread",
    name: "Thread/get",
    path: "/list/0/emailIds",
  });
});

test("queries and removes domain dependencies before domain teardown", async (context) => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const body = JSON.parse(String(init.body));
    requests.push(body.methodCalls[0]);
    const [method, args, callId] = body.methodCalls[0];
    const payload = method.endsWith("/query")
      ? { ids: method.includes("DkimSignature") ? ["dkim-1"] : ["account-1"] }
      : method.endsWith("/get")
        ? { list: args.ids.map((id) => ({ id })) }
        : { destroyed: args.destroy };
    return Response.json({ methodResponses: [[method, payload, callId]] });
  };

  const client = new StalwartClient("https://mail.example", "admin", "secret");
  assert.deepEqual(await client.getAccounts(["account-1"]), {
    list: [{ id: "account-1" }],
  });
  assert.deepEqual(await client.queryAccounts("domain-1"), { ids: ["account-1"] });
  assert.deepEqual(await client.queryDkimSignatures("domain-1"), { ids: ["dkim-1"] });
  await client.deleteAccounts(["account-1"]);
  await client.deleteDkimSignatures(["dkim-1"]);
  await client.deleteDomains(["domain-1"]);

  assert.deepEqual(
    requests.map(([method, args]) => [method, args]),
    [
      ["x:Account/get", { ids: ["account-1"] }],
      ["x:Account/query", { filter: { domainId: "domain-1" } }],
      ["x:DkimSignature/query", { filter: { domainId: "domain-1" } }],
      ["x:Account/set", { destroy: ["account-1"] }],
      ["x:DkimSignature/set", { destroy: ["dkim-1"] }],
      ["x:Domain/set", { destroy: ["domain-1"] }],
    ],
  );
});

test("treats an already removed Stalwart object as a successful retry", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, , callId] = JSON.parse(String(init.body)).methodCalls[0];
    return Response.json({
      methodResponses: [
        [method, { notDestroyed: { "domain-1": { type: "notFound" } } }, callId],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "admin", "secret");
  await client.deleteDomains(["domain-1"]);
});

test("reports a failed Stalwart destroy instead of deleting the Redakt user", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, , callId] = JSON.parse(String(init.body)).methodCalls[0];
    return Response.json({
      methodResponses: [
        [method, { notDestroyed: { "domain-1": { description: "objectIsLinked" } } }, callId],
      ],
    });
  };

  const client = new StalwartClient("https://mail.example", "admin", "secret");
  await assert.rejects(client.deleteDomains(["domain-1"]), /objectIsLinked/);
});

test("creates multipart text and HTML message bodies", async (context) => {
  let create;
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (String(input).endsWith("/.well-known/jmap")) {
      return Response.json({ apiUrl: "https://mail.example/jmap" });
    }
    const [method, args, callId] = JSON.parse(String(init.body)).methodCalls[0];
    create = args.create.draft1;
    return Response.json({
      methodResponses: [[method, { created: { draft1: { id: "email-1" } } }, callId]],
    });
  };

  const client = new StalwartClient("https://mail.example", "admin", "secret");
  await client.createDraft("account-1", "drafts-1", {
    from: { name: "Ada", email: "ada@example.com" },
    to: [{ name: "", email: "reader@example.com" }],
    subject: "Formatted",
    text: "First line\nSecond line",
    html: '<div class="redakt-composer"><p>First <b>line</b></p><p>Second line</p></div>',
  });

  assert.deepEqual(create.textBody, [{ partId: "t1", type: "text/plain" }]);
  assert.deepEqual(create.htmlBody, [{ partId: "h1", type: "text/html" }]);
  assert.equal(create.bodyValues.t1.value, "First line\nSecond line");
  assert.match(create.bodyValues.h1.value, /<b>line<\/b>/);
});
