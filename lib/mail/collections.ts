import type { MailCollectionKind, MailViewId } from "./types";

export const MAX_COLLECTION_NAME_LENGTH = 64;

export function collectionTerm(kind: MailCollectionKind) {
  return kind === "label" ? "label" : "folder";
}

export function normalizeCollectionName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_COLLECTION_NAME_LENGTH) return null;
  return name;
}

export function folderCollectionTransfer(
  collectionId: string,
  selected: boolean,
  fromView: MailViewId,
) {
  const collectionView = `collection:${collectionId}` as const;
  return selected
    ? { source: fromView, destination: collectionView }
    : { source: collectionView, destination: "inbox" as const };
}
