import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { resendCredentials } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

export async function saveUserResendCredentials(
  userId: string,
  apiKey: string,
  webhookSecret: string,
) {
  await getDb()
    .insert(resendCredentials)
    .values({
      userId,
      apiKey: encryptSecret(apiKey),
      webhookSecret: encryptSecret(webhookSecret),
    })
    .onConflictDoUpdate({
      target: resendCredentials.userId,
      set: {
        apiKey: encryptSecret(apiKey),
        webhookSecret: encryptSecret(webhookSecret),
        updatedAt: new Date(),
      },
    });
}

export async function getUserResendCredentials(userId: string) {
  const [row] = await getDb()
    .select()
    .from(resendCredentials)
    .where(eq(resendCredentials.userId, userId));
  return row
    ? {
        apiKey: decryptSecret(row.apiKey),
        webhookSecret: decryptSecret(row.webhookSecret),
      }
    : null;
}
