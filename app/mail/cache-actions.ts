"use server";

import { updateTag } from "next/cache";
import { resolveMailAccount } from "@/lib/mail/accounts";
import { mailAccountCacheTag } from "@/lib/mail/cache";
import { getSessionUser } from "@/lib/session";

export async function invalidateMailAccountCache(accountId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const account = await resolveMailAccount(user, accountId);
  updateTag(mailAccountCacheTag(account.id));
}
