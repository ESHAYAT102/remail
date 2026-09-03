import assert from "node:assert/strict";
import test from "node:test";
import { parseZoneFile } from "./parse-zone.ts";
import {
  partitionDnsRecords,
  relativeDnsHost,
  summarizeRequiredDnsChecks,
} from "./records.ts";

const domain = "example.com";

const zone = `
v1-ed25519-20260901._domainkey.example.com. IN TXT "v=DKIM1; k=ed25519; h=sha256; p=EDKEY="
v1-rsa-20260901._domainkey.example.com. IN TXT (
  "v=DKIM1; k=rsa; h=sha256; p=FIRST"
  "SECOND"
)
example.com. IN TXT "v=spf1 mx -all"
example.com. IN MX 10 mail.redakt.app.
_dmarc.example.com. IN TXT "v=DMARC1; p=reject; rua=mailto:postmaster@example.com"
mta-sts.example.com. IN CNAME mail.redakt.app.
_mta-sts.example.com. IN TXT "v=STSv1; id=123"
_smtp._tls.example.com. IN TXT "v=TLSRPTv1; rua=mailto:postmaster@example.com"
`;

test("parses parenthesized multiline TXT values as one DNS record", () => {
  const records = parseZoneFile(zone);
  const rsa = records.find((record) => record.host.startsWith("v1-rsa-"));

  assert.equal(rsa?.value, "v=DKIM1; k=rsa; h=sha256; p=FIRSTSECOND");
});

test("separates the four required records from advanced records", () => {
  const records = parseZoneFile(zone);
  const partitioned = partitionDnsRecords(records, domain);

  assert.deepEqual(
    partitioned.required.map((record) => [record.type, record.host]),
    [
      ["MX", "example.com"],
      ["TXT", "example.com"],
      ["TXT", "v1-rsa-20260901._domainkey.example.com"],
      ["TXT", "_dmarc.example.com"],
    ],
  );
  assert.equal(partitioned.advanced.length, 4);
  assert.deepEqual(partitioned.missingRequired, []);
});

test("keeps every apex MX record required", () => {
  const records = parseZoneFile(
    `${zone}\nexample.com. IN MX 20 backup.redakt.app.`,
  );
  const partitioned = partitionDnsRecords(records, domain);

  assert.deepEqual(
    partitioned.required
      .filter((record) => record.type === "MX")
      .map((record) => record.value),
    ["mail.redakt.app", "backup.redakt.app"],
  );
  assert.equal(partitioned.required.length, 5);
  assert.equal(partitioned.advanced.length, 4);

  const incomplete = summarizeRequiredDnsChecks(
    records.map((record) => ({
      ...record,
      ok: record.value !== "backup.redakt.app",
    })),
    domain,
  );
  assert.equal(incomplete.okCount, 4);
  assert.equal(incomplete.ready, false);

  const complete = summarizeRequiredDnsChecks(
    records.map((record) => ({ ...record, ok: true })),
    domain,
  );
  assert.equal(complete.okCount, 5);
  assert.equal(complete.ready, true);
});

test("treats an omitted DKIM key type as RSA", () => {
  const records = parseZoneFile(zone.replace("k=rsa; ", ""));
  const partitioned = partitionDnsRecords(records, domain);

  assert.equal(
    partitioned.required.some((record) =>
      record.host.startsWith("v1-rsa-"),
    ),
    true,
  );
  assert.deepEqual(partitioned.missingRequired, []);
});

test("optional records do not prevent a domain from becoming ready", () => {
  const checks = parseZoneFile(zone).map((record) => ({
    ...record,
    ok: !record.host.startsWith("_mta-sts") && !record.host.startsWith("_smtp"),
  }));
  const required = summarizeRequiredDnsChecks(checks, domain);

  assert.equal(required.okCount, 4);
  assert.equal(required.ready, true);
});

test("formats DNS hosts for registrar input without duplicating the domain", () => {
  assert.equal(relativeDnsHost("example.com", domain), "@");
  assert.equal(relativeDnsHost("_dmarc.example.com.", domain), "_dmarc");
  assert.equal(
    relativeDnsHost("v1-rsa._domainkey.example.com", domain),
    "v1-rsa._domainkey",
  );
});
