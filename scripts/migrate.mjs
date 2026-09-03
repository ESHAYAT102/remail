import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for database migrations.");
}

const migrationsDirectory = fileURLToPath(
  new URL("../lib/db/migrations/", import.meta.url),
);
const journal = JSON.parse(
  await readFile(path.join(migrationsDirectory, "meta/_journal.json"), "utf8"),
);
const migrations = await Promise.all(
  journal.entries.map(async (entry) => {
    const sql = await readFile(
      path.join(migrationsDirectory, `${entry.tag}.sql`),
      "utf8",
    );

    return {
      createdAt: entry.when,
      hash: createHash("sha256").update(sql).digest("hex"),
      statements: sql.split("--> statement-breakpoint"),
      tag: entry.tag,
    };
  }),
);

const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("select pg_advisory_lock(hashtext('redakt-migrations'))");
  await client.query('create schema if not exists "drizzle"');
  await client.query(`
    create table if not exists "drizzle"."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);

  const { rows } = await client.query(
    'select hash, created_at from "drizzle"."__drizzle_migrations" order by created_at',
  );
  const applied = new Map(
    rows.map(({ hash, created_at: createdAt }) => [Number(createdAt), hash]),
  );
  const latestApplied = Math.max(0, ...applied.keys());

  await client.query("begin");

  for (const migration of migrations) {
    const appliedHash = applied.get(migration.createdAt);

    if (appliedHash) {
      if (appliedHash !== migration.hash) {
        throw new Error(`Migration ${migration.tag} changed after it was applied.`);
      }

      continue;
    }

    if (migration.createdAt < latestApplied) {
      throw new Error(`Migration history is missing ${migration.tag}.`);
    }

    for (const statement of migration.statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }

    await client.query(
      'insert into "drizzle"."__drizzle_migrations" (hash, created_at) values ($1, $2)',
      [migration.hash, migration.createdAt],
    );
    console.log(`Applied migration ${migration.tag}.`);
  }

  await client.query("commit");

  if (migrations.every((migration) => applied.has(migration.createdAt))) {
    console.log("Database migrations are already current.");
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client
    .query("select pg_advisory_unlock(hashtext('redakt-migrations'))")
    .catch(() => {});
  client.release();
  await pool.end();
}
