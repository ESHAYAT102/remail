import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import {
  findDemoUser,
  getDemoDomain,
  listDemoDomains,
  listDemoSent,
  saveDemoDomain,
  saveDemoSent,
  updateDemoMailboxSecret,
  updateDemoUserName,
} from "@/lib/demo/store";
import { getDb } from "@/lib/db";
import { domains, mailboxes } from "@/lib/db/schema";
import { summarizeRequiredDnsChecks } from "@/lib/dns/records";
import { isDemoMode } from "@/lib/env";
import type { DomainSetup, ThreadDetail } from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";
import { getResend } from "@/lib/resend/client";

function db() {
  return getDb();
}

export async function updateUserName(user: SessionUser, name: string) {
  if (isDemoMode()) {
    const next = updateDemoUserName(user.id, name);
    return next ? { ...user, name: next.name } : user;
  }
  return { ...user, name };
}

export async function listUserDomains(user: SessionUser) {
  if (isDemoMode()) return listDemoDomains(user.id);
  const rows = await db().select().from(domains).where(eq(domains.userId, user.id));
  return rows.map(rowToDomain);
}

export async function getUserDomain(user: SessionUser, id: string) {
  if (isDemoMode()) return getDemoDomain(user.id, id);
  const [row] = await db().select().from(domains).where(eq(domains.id, id));
  if (!row || row.userId !== user.id) return null;
  return rowToDomain(row);
}

export async function getDomainByName(name: string) {
  if (isDemoMode()) return null;
  const [row] = await db().select().from(domains).where(eq(domains.name, name));
  return row ?? null;
}

export async function saveUserDomain(user: SessionUser, domain: DomainSetup) {
  if (isDemoMode()) return saveDemoDomain(user.id, domain);
  const required = summarizeRequiredDnsChecks(domain.checks, domain.name);
  const cached = JSON.stringify({
    records: domain.records,
    checks: domain.checks,
    mailbox: domain.mailbox,
  });
  await db()
    .insert(domains)
    .values({
      id: domain.id,
      userId: user.id,
      name: domain.name,
      status: domain.status,
      stalwartId: domain.id,
      zoneCache: cached,
      lastCheckedAt: domain.lastCheckedAt ? new Date(domain.lastCheckedAt) : null,
      okCount: required.okCount,
    })
    .onConflictDoUpdate({
      target: domains.id,
      set: {
        status: domain.status,
        zoneCache: cached,
        lastCheckedAt: domain.lastCheckedAt
          ? new Date(domain.lastCheckedAt)
          : null,
        okCount: required.okCount,
      },
    });
  return domain;
}

export async function setMailboxSecret(
  user: SessionUser,
  email: string,
  secret: string,
  stalwartAccountId?: string,
) {
  if (isDemoMode()) {
    updateDemoMailboxSecret(user.id, secret);
    return;
  }
  const encrypted = encryptSecret(secret);
  const [existing] = await db().select().from(mailboxes).where(eq(mailboxes.userId, user.id));
  if (existing) {
    await db()
      .update(mailboxes)
      .set({ email, secret: encrypted, stalwartAccountId })
      .where(eq(mailboxes.id, existing.id));
    return;
  }
  await db().insert(mailboxes).values({
    id: `mbx_${user.id}`,
    userId: user.id,
    email,
    secret: encrypted,
    stalwartAccountId,
  });
}

export async function deleteUserMailData(userId: string) {
  const domainRows = await db().select().from(domains).where(eq(domains.userId, userId));
  try {
    const resend = await getResend(userId);
    for (const domain of domainRows) {
      const result = await resend.domains.remove(domain.id);
      if (result.error && result.error.name !== "not_found") {
        console.warn("Unable to remove Resend domain during account deletion", {
          domainId: domain.id,
          error: result.error.name,
        });
      }
    }
  } catch (error) {
    // A revoked or expired provider credential must not prevent users from
    // deleting their local account and all data covered by database cascades.
    console.warn("Skipping Resend cleanup during account deletion", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function getMailboxSecret(user: SessionUser) {
  if (isDemoMode()) {
    return findDemoUser(user.id)?.mailboxSecret ?? null;
  }
  const [row] = await db().select().from(mailboxes).where(eq(mailboxes.userId, user.id));
  if (!row) return null;
  return decryptSecret(row.secret);
}

export async function getMailboxMetadata(user: SessionUser) {
  if (isDemoMode()) {
    const demo = findDemoUser(user.id);
    return demo ? { email: demo.email } : null;
  }
  const [domain] = await db()
    .select()
    .from(domains)
    .where(eq(domains.userId, user.id));
  if (domain) {
    const setup = rowToDomain(domain);
    if (setup.mailbox) return { email: setup.mailbox };
  }
  const [row] = await db()
    .select({ email: mailboxes.email })
    .from(mailboxes)
    .where(eq(mailboxes.userId, user.id));
  return row ?? null;
}

export async function listUserSent(user: SessionUser) {
  if (!isDemoMode()) return [];
  return listDemoSent(user.id);
}

export async function saveUserSent(user: SessionUser, thread: ThreadDetail) {
  if (!isDemoMode()) return thread;
  return saveDemoSent(user.id, thread);
}

function rowToDomain(row: typeof domains.$inferSelect): DomainSetup {
  const cached = row.zoneCache
    ? (JSON.parse(row.zoneCache) as Pick<DomainSetup, "records" | "checks" | "mailbox">)
    : { records: [], checks: [], mailbox: undefined };
  return {
    id: row.id,
    name: row.name,
    status: (row.status as DomainSetup["status"]) ?? "pending",
    records: cached.records ?? [],
    checks: cached.checks ?? [],
    mailbox: cached.mailbox,
    lastCheckedAt: row.lastCheckedAt?.toISOString(),
  };
}
