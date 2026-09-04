import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { account } from "@/lib/db/schema";

export async function userHasPassword(userId: string) {
  const [credential] = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
        isNotNull(account.password),
      ),
    );
  return Boolean(credential);
}
