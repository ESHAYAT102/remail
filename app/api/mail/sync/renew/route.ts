import { NextResponse } from "next/server";
import { matchesBearerToken } from "@/lib/crypto/tokens";
import { listMailAccountsNeedingSubscription } from "@/lib/data/mail-accounts";
import { getMailSyncCronSecret } from "@/lib/env";
import { ensureGmailSubscription } from "@/lib/gmail/sync";

const RENEW_BEFORE_MS = 36 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const secret = getMailSyncCronSecret();
  if (!matchesBearerToken(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listMailAccountsNeedingSubscription(
    new Date(Date.now() + RENEW_BEFORE_MS),
  );
  const results = await Promise.allSettled(
    accounts.map((account) =>
      ensureGmailSubscription({ id: account.userId }, account.id),
    ),
  );
  return NextResponse.json({
    checked: accounts.length,
    renewed: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  });
}
