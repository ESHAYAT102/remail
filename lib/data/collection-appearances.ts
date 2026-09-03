import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { mailCollectionAppearances } from "@/lib/db/schema";
import {
  listDemoCollections,
  saveDemoCollection,
} from "@/lib/demo/store";
import { isDemoMode } from "@/lib/env";
import {
  normalizeCollectionColor,
  normalizeCollectionIcon,
  type CollectionAppearance,
} from "@/lib/mail/collection-appearance";
import type { MailCollection } from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";

function appearanceFrom(value: { icon?: unknown; color?: unknown }) {
  const icon = normalizeCollectionIcon(value.icon);
  const color = normalizeCollectionColor(value.color);
  return icon && color ? { icon, color } : null;
}

export async function listMailCollectionAppearances(
  user: SessionUser,
  accountId: string,
) {
  if (isDemoMode()) {
    return new Map(
      listDemoCollections(user.id).flatMap((collection) => {
        const appearance = appearanceFrom(collection);
        return appearance ? [[collection.id, appearance] as const] : [];
      }),
    );
  }

  const values = await getDb()
    .select({
      collectionId: mailCollectionAppearances.collectionId,
      icon: mailCollectionAppearances.icon,
      color: mailCollectionAppearances.color,
    })
    .from(mailCollectionAppearances)
    .where(
      and(
        eq(mailCollectionAppearances.userId, user.id),
        eq(mailCollectionAppearances.accountId, accountId),
      ),
    );

  return new Map(
    values.flatMap((value) => {
      const appearance = appearanceFrom(value);
      return appearance ? [[value.collectionId, appearance] as const] : [];
    }),
  );
}

export function applyMailCollectionAppearances(
  collections: MailCollection[],
  appearances: ReadonlyMap<string, CollectionAppearance>,
) {
  return collections.map((collection) => ({
    ...collection,
    ...appearances.get(collection.id),
  }));
}

export async function saveMailCollectionAppearance(
  user: SessionUser,
  accountId: string,
  collection: MailCollection,
  appearance: CollectionAppearance,
) {
  if (isDemoMode()) {
    const stored = listDemoCollections(user.id).find(
      (value) => value.id === collection.id,
    );
    return saveDemoCollection(user.id, {
      ...(stored ?? collection),
      ...appearance,
    });
  }

  await getDb()
    .insert(mailCollectionAppearances)
    .values({
      userId: user.id,
      accountId,
      collectionId: collection.id,
      ...appearance,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        mailCollectionAppearances.userId,
        mailCollectionAppearances.accountId,
        mailCollectionAppearances.collectionId,
      ],
      set: { ...appearance, updatedAt: new Date() },
    });

  return { ...collection, ...appearance };
}

export async function deleteMailCollectionAppearance(
  user: SessionUser,
  accountId: string,
  collectionId: string,
) {
  if (isDemoMode()) return;
  await getDb()
    .delete(mailCollectionAppearances)
    .where(
      and(
        eq(mailCollectionAppearances.userId, user.id),
        eq(mailCollectionAppearances.accountId, accountId),
        eq(mailCollectionAppearances.collectionId, collectionId),
      ),
    );
}
