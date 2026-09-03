import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { completeGoogleMailAccounts } from "@/lib/google/mail-accounts";
import { gmailCompletionRedirectUrl } from "@/lib/google/oauth";
import { ensureGmailSubscription } from "@/lib/gmail/sync";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(
      gmailCompletionRedirectUrl(getAppUrl(), "unauthorized"),
    );
  }

  const connected = await completeGoogleMailAccounts(user);
  await Promise.allSettled(
    connected.map((account) =>
      ensureGmailSubscription(user, account.id),
    ),
  );
  return NextResponse.redirect(
    gmailCompletionRedirectUrl(
      getAppUrl(),
      connected.length > 0 ? "connected" : "error",
    ),
  );
}
