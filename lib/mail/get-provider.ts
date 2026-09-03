import { isDemoMode } from "@/lib/env";
import { createDemoProvider } from "@/lib/demo/provider";
import { GmailClient } from "@/lib/gmail/client";
import { GmailProvider } from "@/lib/gmail/provider";
import { getGoogleAccessToken } from "@/lib/google/mail-accounts";
import { createResendProvider } from "@/lib/resend/provider";
import type { SessionUser } from "@/lib/session";
import { createHostedMailAccount, resolveMailAccount } from "./accounts";
import type { DomainProvider, MailProvider } from "./provider";

export async function getMailProvider(
  user: SessionUser,
  accountId?: string | null,
): Promise<MailProvider> {
  const account = await resolveMailAccount(user, accountId);
  if (account.connector === "gmail") {
    const accessToken = await getGoogleAccessToken(user, account.id);
    return new GmailProvider(account, new GmailClient(accessToken));
  }
  if (account.connector === "hosted") {
    return isDemoMode()
      ? createDemoProvider(user, account)
      : createResendProvider(user, account);
  }
  throw new Error(`Unsupported mail connector: ${account.connector}`);
}

export function getDomainProvider(user: SessionUser): DomainProvider {
  const account = createHostedMailAccount(user);
  return isDemoMode()
    ? createDemoProvider(user, account)
    : createResendProvider(user, account);
}
