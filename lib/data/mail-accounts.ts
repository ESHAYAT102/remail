import "server-only";

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { account, mailAccounts } from "@/lib/db/schema";
import { GMAIL_MODIFY_SCOPE } from "@/lib/google/scopes";

export type GoogleOAuthAccountRow = {
  id: string;
  providerAccountId: string;
  scope: string | null;
};

export type StoredMailAccount = typeof mailAccounts.$inferSelect;

export async function listGoogleOAuthAccounts(
  userId: string,
): Promise<GoogleOAuthAccountRow[]> {
  const rows = await getDb()
    .select({
      id: account.id,
      providerAccountId: account.accountId,
      scope: account.scope,
    })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "google"),
      ),
    );
  return rows.filter((row) => hasScope(row.scope, GMAIL_MODIFY_SCOPE));
}

export async function findGoogleOAuthAccount(userId: string, accountId: string) {
  const [row] = await getDb()
    .select({
      id: account.id,
      providerAccountId: account.accountId,
      scope: account.scope,
    })
    .from(account)
    .where(
      and(
        eq(account.id, accountId),
        eq(account.userId, userId),
        eq(account.providerId, "google"),
      ),
    );
  return row && hasScope(row.scope, GMAIL_MODIFY_SCOPE) ? row : null;
}

function hasScope(value: string | null, expected: string) {
  return (value ?? "").split(/[\s,]+/).includes(expected);
}

export async function listStoredMailAccounts(userId: string) {
  return getDb()
    .select()
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId));
}

export async function findStoredMailAccount(
  userId: string,
  mailAccountId: string,
) {
  const [row] = await getDb()
    .select()
    .from(mailAccounts)
    .where(
      and(
        eq(mailAccounts.id, mailAccountId),
        eq(mailAccounts.userId, userId),
      ),
    );
  return row ?? null;
}

export async function findStoredMailAccountByExternalId(
  connector: string,
  externalAccountId: string,
) {
  const [row] = await getDb()
    .select()
    .from(mailAccounts)
    .where(
      and(
        eq(mailAccounts.connector, connector),
        eq(mailAccounts.externalAccountId, externalAccountId),
      ),
    );
  return row ?? null;
}

export async function listStoredMailAccountsByEmail(
  connector: string,
  email: string,
) {
  return getDb()
    .select()
    .from(mailAccounts)
    .where(
      and(
        eq(mailAccounts.connector, connector),
        eq(mailAccounts.email, email.toLowerCase()),
      ),
    );
}

export async function listMailAccountsNeedingSubscription(before: Date) {
  return getDb()
    .select()
    .from(mailAccounts)
    .where(
      and(
        eq(mailAccounts.connector, "gmail"),
        eq(mailAccounts.status, "connected"),
        or(
          isNull(mailAccounts.subscriptionExpiresAt),
          lt(mailAccounts.subscriptionExpiresAt, before),
        ),
      ),
    );
}

export async function saveMailAccount(input: {
  id: string;
  userId: string;
  connector: string;
  externalAccountId: string;
  authAccountId?: string | null;
  email: string;
  displayName: string;
  image?: string | null;
  syncCursor?: string | null;
}) {
  const now = new Date();
  const [row] = await getDb()
    .insert(mailAccounts)
    .values({
      id: input.id,
      userId: input.userId,
      connector: input.connector,
      externalAccountId: input.externalAccountId,
      authAccountId: input.authAccountId,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      image: input.image,
      syncCursor: input.syncCursor,
      status: "connected",
      lastSyncedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: mailAccounts.id,
      set: {
        connector: input.connector,
        externalAccountId: input.externalAccountId,
        authAccountId: input.authAccountId,
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        image: input.image,
        syncCursor: input.syncCursor,
        status: "connected",
        lastSyncedAt: now,
        lastError: null,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

export async function updateMailAccountSyncState(
  mailAccountId: string,
  input: {
    syncCursor?: string | null;
    subscriptionExpiresAt?: Date | null;
    status?: "connected" | "reauthorize";
    lastError?: string | null;
    changed?: boolean;
    synced?: boolean;
  },
) {
  const update = {
    updatedAt: new Date(),
    ...(input.syncCursor !== undefined
      ? { syncCursor: input.syncCursor }
      : {}),
    ...(input.subscriptionExpiresAt !== undefined
      ? { subscriptionExpiresAt: input.subscriptionExpiresAt }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.lastError !== undefined ? { lastError: input.lastError } : {}),
    ...(input.changed
      ? {
          syncRevision: sql<number>`${mailAccounts.syncRevision} + 1`,
        }
      : {}),
    ...(input.synced ? { lastSyncedAt: new Date() } : {}),
  };
  const [row] = await getDb()
    .update(mailAccounts)
    .set(update)
    .where(eq(mailAccounts.id, mailAccountId))
    .returning();
  return row ?? null;
}

export async function deleteMailAccount(mailAccountId: string) {
  await getDb()
    .delete(mailAccounts)
    .where(eq(mailAccounts.id, mailAccountId));
}

export async function clearOAuthCredential(
  userId: string,
  authAccountId: string,
) {
  await getDb()
    .update(account)
    .set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(account.id, authAccountId),
        eq(account.userId, userId),
        eq(account.providerId, "google"),
      ),
    );
}

export async function clearOAuthIdentityToken(
  userId: string,
  authAccountId: string,
) {
  await getDb()
    .update(account)
    .set({ idToken: null, updatedAt: new Date() })
    .where(
      and(
        eq(account.id, authAccountId),
        eq(account.userId, userId),
        eq(account.providerId, "google"),
      ),
    );
}
