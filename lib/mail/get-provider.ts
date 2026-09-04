import { isDemoMode } from "@/lib/env";
import { createDemoProvider } from "@/lib/demo/provider";
import { createResendProvider } from "@/lib/resend/provider";
import type { SessionUser } from "@/lib/session";
import { createHostedMailAccount, resolveMailAccount } from "./accounts";
import type { DomainProvider, MailProvider } from "./provider";

export async function getMailProvider(
  user: SessionUser,
  accountId?: string | null,
): Promise<MailProvider> {
  const account = await resolveMailAccount(user, accountId);
  return isDemoMode()
    ? createDemoProvider(user, account)
    : createResendProvider(user, account);
}

export function getDomainProvider(user: SessionUser): DomainProvider {
  const account = createHostedMailAccount(user);
  return isDemoMode()
    ? createDemoProvider(user, account)
    : createResendProvider(user, account);
}
