import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { collectionCountsQuery, folderCountsQuery, threadAttachmentsQuery, threadListQuery } from "./queries.ts";

const db = new PGlite();
const dialect = new PgDialect();
async function run(query) {
  const { sql, params } = dialect.sqlToQuery(query);
  return (await db.query(sql, params)).rows;
}

before(async () => {
  await db.exec(`
    create table hosted_messages (
      id text primary key, user_id text, thread_id text, folder text,
      subject text, "from" jsonb, text text, html text, unread boolean, received_at timestamp
    );
    create table hosted_attachments (
      id text primary key, message_id text, filename text, mime_type text,
      size integer, content_id text, inline boolean, content text
    );
    create table hosted_collections (id text primary key, user_id text, name text);
  `);
  const messages = [
    ["m1", "alice", "conversation", "inbox", "First subject", "First\n\nOn yesterday, Bob wrote:\nold quote", true, "2026-10-01"],
    ["m2", "alice", "conversation", "inbox", "Latest subject", "Latest\n  reply", false, "2026-10-03"],
    ["m3", "alice", "other", "inbox", "100% _ match", "Body needle", false, "2026-10-02"],
    ["m4", "alice", "archived", "archived", "Archived", "Large body", true, "2026-10-04"],
    ["m5", "alice", "draft", "drafts", "", "Draft", false, "2026-10-05"],
    ["m6", "alice", "custom", "collection:work", "Work", "Work", true, "2026-10-06"],
    ["m7", "alice", "custom", "collection:work", "Work reply", "Work reply", true, "2026-10-07"],
    ["m8", "bob", "conversation", "inbox", "Private", "Other user's body", true, "2026-10-08"],
  ];
  for (const [id, owner, thread, folder, subject, text, unread, date] of messages) {
    await db.query(`insert into hosted_messages values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, owner, thread, folder, subject, { name: "Sender", email: `${id}@example.com` }, text, "<html>" + "x".repeat(500_000) + "</html>", unread, date]);
  }
  for (const [id, message, inline] of [["normal", "m1", false], ["inline", "m3", true], ["draft-file", "m5", false], ["private", "m8", false]]) {
    await db.query(`insert into hosted_attachments values ($1,$2,'file','text/plain',100,null,$3,$4)`, [id, message, inline, "x".repeat(500_000)]);
  }
  await db.exec(`insert into hosted_collections values ('work','alice','Work'),('empty','alice','Empty'),('private','bob','Private')`);
});
after(async () => db.close());

test("thread pages aggregate unread conversations and only return bounded summaries", async () => {
  const [page] = await run(threadListQuery("alice", "inbox", { limit: 1 }));
  assert.equal(page.total, 2);
  assert.equal(page.unread, 1);
  assert.equal(page.threads.length, 1);
  const thread = page.threads[0];
  assert.equal(thread.id, "conversation");
  assert.equal(thread.subject, "Latest subject");
  assert.equal(thread.date, "2026-10-03T00:00:00.000Z");
  assert.equal(thread.snippet, "Latest reply");
  assert.equal(thread.messageCount, 2);
  assert.equal(thread.unread, true);
  assert.equal(thread.hasAttachment, true);
  assert.ok(JSON.stringify(page).length < 1000, "large bodies and attachment bytes must stay in Postgres");
  const [next] = await run(threadListQuery("alice", "inbox", { limit: 1, offset: 1 }));
  assert.equal(next.threads[0].id, "other");
  const [pastEnd] = await run(threadListQuery("alice", "inbox", { offset: 100 }));
  assert.equal(pastEnd.total, 2);
  assert.deepEqual(pastEnd.threads, []);
});

test("search stays literal, includes body text, and never crosses users or folders", async () => {
  for (const q of ["NEEDLE", "100% _"]) {
    const [page] = await run(threadListQuery("alice", "inbox", { q }));
    assert.equal(page.total, 1);
    assert.equal(page.threads[0].id, "other");
  }
  for (const q of ["Private", "Archived", "' OR 1=1 --"]) {
    const [page] = await run(threadListQuery("alice", "inbox", { q }));
    assert.equal(page.total, 0);
  }
});

test("unread and smart views retain the existing matching-message semantics", async () => {
  for (const folder of ["inbox", "smart"]) {
    const [page] = await run(threadListQuery("alice", folder, { unread: true }));
    assert.equal(page.total, 1);
    assert.equal(page.threads[0].messageCount, 1);
    assert.equal(page.threads[0].subject, "First subject");
    assert.equal(page.threads[0].snippet, "First");
  }
});

test("attachment filters exclude inline images and sorting/paging happens before transfer", async () => {
  const [attached] = await run(threadListQuery("alice", "inbox", { hasAttachment: true }));
  assert.equal(attached.total, 1);
  assert.equal(attached.threads[0].id, "conversation");
  for (const sort of ["date", "subject", "from"]) {
    const [page] = await run(threadListQuery("alice", "inbox", { sort, order: "asc", limit: 1 }));
    assert.equal(page.threads[0].id, sort === "from" ? "conversation" : "other");
  }
});

test("folder and custom-folder counts are distinct unread threads, including empty folders", async () => {
  assert.deepEqual(await run(folderCountsQuery("alice")), [
    { folder: "archived", unread: 1 },
    { folder: "collection:work", unread: 1 },
    { folder: "inbox", unread: 1 },
  ]);
  assert.deepEqual(await run(collectionCountsQuery("alice")), [
    { id: "empty", name: "Empty", total: 0, unread: 0 },
    { id: "work", name: "Work", total: 1, unread: 1 },
  ]);
});

test("attachment reads omit saved bytes for readers, retain draft bytes, and enforce ownership", async () => {
  const files = await run(threadAttachmentsQuery("alice", ["m1", "m5", "m8"]));
  assert.equal(files.length, 2);
  assert.equal(files.find((file) => file.id === "normal").content, null);
  assert.equal(files.find((file) => file.id === "draft-file").content.length, 500_000);
  const [draft] = await run(threadListQuery("alice", "drafts"));
  assert.equal(draft.threads[0].draftId, "m5");
  assert.equal(draft.threads[0].subject, "(no subject)");
});


test("refresh payload stays small as stored bodies and attachments grow", async (t) => {
  const oldRows = await db.query("select * from hosted_messages where user_id = $1", ["alice"]);
  const oldRefreshBytes = Buffer.byteLength(JSON.stringify(oldRows.rows)) * 3;
  const results = await Promise.all([
    run(threadListQuery("alice", "inbox")),
    run(folderCountsQuery("alice")),
    run(collectionCountsQuery("alice")),
  ]);
  const newRefreshBytes = Buffer.byteLength(JSON.stringify(results));
  assert.ok(newRefreshBytes < 2000);
  assert.ok(oldRefreshBytes / newRefreshBytes > 1000);
  t.diagnostic(`Synthetic refresh: ${oldRefreshBytes} bytes before, ${newRefreshBytes} bytes after (large-body fixtures).`);
});
