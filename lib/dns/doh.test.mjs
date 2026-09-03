import assert from "node:assert/strict";
import test from "node:test";
import { verifyRecords } from "./doh.ts";

const domain = "example.com";
const dkimHost = `v1-rsa._domainkey.${domain}`;
const records = [
  { type: "MX", host: domain, priority: 10, value: "mail.redakt.app" },
  { type: "TXT", host: domain, value: "v=spf1 mx -all" },
  { type: "TXT", host: dkimHost, value: "v=DKIM1; k=rsa; p=FIRSTSECOND" },
  { type: "TXT", host: `_dmarc.${domain}`, value: "v=DMARC1; p=reject" },
];

function answer(type, data) {
  return { name: domain, type, data };
}

test("reports records copied to doubled registrar hostnames", async (context) => {
  const responses = new Map([
    [`MX:${domain}`, []],
    [`TXT:${domain}`, [answer(16, '"google-site-verification=existing"')]],
    [`TXT:${dkimHost}`, []],
    [`TXT:_dmarc.${domain}`, []],
    [`MX:${domain}.${domain}`, [answer(15, "10 mail.redakt.app.")]],
    [`TXT:${domain}.${domain}`, [answer(16, '"v=spf1 mx -all"')]],
    [
      `TXT:${dkimHost}.${domain}`,
      [answer(16, '"v=DKIM1; k=rsa; p=FIRST" "SECOND"')],
    ],
    [
      `TXT:_dmarc.${domain}.${domain}`,
      [answer(16, '"v=DKIM1; k=rsa; p=wrong-key"')],
    ],
  ]);
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const key = `${url.searchParams.get("type")}:${url.searchParams.get("name")}`;
    return new Response(JSON.stringify({ Answer: responses.get(key) ?? [] }), {
      headers: { "content-type": "application/json" },
    });
  };

  const checks = await verifyRecords(records, domain);

  assert.deepEqual(
    checks.map(({ ok, observedHost, mismatch }) => ({ ok, observedHost, mismatch })),
    [
      { ok: false, observedHost: `${domain}.${domain}`, mismatch: "host" },
      { ok: false, observedHost: `${domain}.${domain}`, mismatch: "host" },
      { ok: false, observedHost: `${dkimHost}.${domain}`, mismatch: "host" },
      {
        ok: false,
        observedHost: `_dmarc.${domain}.${domain}`,
        mismatch: "host-and-value",
      },
    ],
  );
});

test("accepts chunked TXT answers at the expected hostname", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        Answer: [answer(16, '"v=DKIM1; k=rsa; p=FIRST" "SECOND"')],
      }),
      { headers: { "content-type": "application/json" } },
    );

  const [check] = await verifyRecords([records[2]], domain);

  assert.equal(check.ok, true);
  assert.equal(check.mismatch, undefined);
});

test("accepts one SPF policy alongside unrelated TXT records", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        Answer: [
          answer(16, '"v=spf1 mx -all"'),
          answer(16, '"google-site-verification=existing"'),
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );

  const [check] = await verifyRecords([records[1]], domain);

  assert.equal(check.ok, true);
  assert.equal(check.conflict, undefined);
});

test("rejects multiple SPF policies at the expected hostname", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        Answer: [
          answer(16, '"v=spf1 mx -all"'),
          answer(16, '"v=spf1 include:_spf.example.net ~all"'),
          answer(16, '"google-site-verification=existing"'),
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );

  const [check] = await verifyRecords([records[1]], domain);

  assert.equal(check.ok, false);
  assert.equal(check.conflict, "spf");
  assert.equal(check.observedHost, domain);
  assert.match(check.observed, /_spf\.example\.net/);
});

test("rejects multiple DMARC policies at the expected hostname", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        Answer: [
          answer(16, '"v=DMARC1; p=reject"'),
          answer(16, '"v=DMARC1; p=none"'),
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );

  const [check] = await verifyRecords([records[3]], domain);

  assert.equal(check.ok, false);
  assert.equal(check.conflict, "dmarc");
  assert.equal(check.observedHost, `_dmarc.${domain}`);
});
