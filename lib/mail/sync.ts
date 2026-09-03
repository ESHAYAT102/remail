import "server-only";

import { resolveMailAccount } from "./accounts";
import { syncGmailAccount } from "@/lib/gmail/sync";
import type { SessionUser } from "@/lib/session";

export async function syncMailAccount(
  user: SessionUser,
  accountId: string,
) {
  const account = await resolveMailAccount(user, accountId);
  if (account.connector === "gmail") {
    return syncGmailAccount(user, account.id);
  }
  return { changed: false, revision: account.syncRevision };
}
