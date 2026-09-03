import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import {
  getDemoUserPreferences,
  saveDemoUserPreferences,
} from "@/lib/demo/store";
import { isDemoMode } from "@/lib/env";
import {
  defaultUserPreferences,
  normalizeUserPreferences,
  type UserPreferences,
} from "@/lib/preferences";
import type { SessionUser } from "@/lib/session";

export async function getUserPreferences(user: SessionUser) {
  if (isDemoMode()) return getDemoUserPreferences(user.id);
  const [row] = await getDb()
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));
  return normalizeUserPreferences(row ?? defaultUserPreferences);
}

export async function updateUserPreferences(
  user: SessionUser,
  patch: Partial<UserPreferences>,
) {
  const current = await getUserPreferences(user);
  const next = normalizeUserPreferences({ ...current, ...patch });
  if (isDemoMode()) return saveDemoUserPreferences(user.id, next);

  const [saved] = await getDb()
    .insert(userPreferences)
    .values({ userId: user.id, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...next, updatedAt: new Date() },
    })
    .returning();
  return normalizeUserPreferences(saved);
}
