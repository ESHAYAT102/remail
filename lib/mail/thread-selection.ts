export type ThreadSelectionResult = {
  selectedIds: Set<string>;
  anchorId: string | null;
};

export type ThreadSelectionCandidate = {
  id: string;
  folder: string;
  unread: boolean;
  favorite?: boolean;
  collectionIds?: string[];
};

export type ThreadSelectionTargets = {
  allIds: string[];
  unreadIds: string[];
  starredIds: string[];
  items: ThreadSelectionCandidate[];
};

export type ThreadBulkAction =
  | { type: "unread"; unread: boolean }
  | { type: "starred"; starred: boolean }
  | { type: "archive" }
  | { type: "move"; destination: "inbox" | "spam" | "trash" }
  | {
      type: "collection";
      collectionId: string;
      selected: boolean;
      removeFromList: boolean;
    };

export type ThreadBulkActionRequest = {
  id: number;
  threadIds: string[];
  action: ThreadBulkAction;
};

export type ThreadBulkActionResult = {
  total: number;
  failed: number;
};

export function collectThreadSelectionTargets(
  threads: readonly ThreadSelectionCandidate[],
): ThreadSelectionTargets {
  const allIds: string[] = [];
  const unreadIds: string[] = [];
  const starredIds: string[] = [];

  for (const thread of threads) {
    allIds.push(thread.id);
    if (thread.unread) unreadIds.push(thread.id);
    if (thread.favorite) starredIds.push(thread.id);
  }

  return {
    allIds,
    unreadIds,
    starredIds,
    items: threads.map((thread) => ({
      ...thread,
      collectionIds: thread.collectionIds ? [...thread.collectionIds] : undefined,
    })),
  };
}

export function toggleAllThreadSelection(
  allIds: readonly string[],
  currentIds: ReadonlySet<string>,
) {
  const allSelected =
    allIds.length > 0 && allIds.every((id) => currentIds.has(id));
  return allSelected ? new Set<string>() : new Set(allIds);
}

export function updateThreadSelection(
  orderedIds: readonly string[],
  currentIds: ReadonlySet<string>,
  targetId: string,
  anchorId: string | null,
  range: boolean,
): ThreadSelectionResult {
  const visibleIds = new Set(orderedIds);
  const selectedIds = new Set(
    [...currentIds].filter((id) => visibleIds.has(id)),
  );
  const targetIndex = orderedIds.indexOf(targetId);
  if (targetIndex === -1) return { selectedIds, anchorId };

  if (range) {
    const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1;
    if (anchorIndex !== -1) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      for (let index = start; index <= end; index += 1) {
        selectedIds.add(orderedIds[index]);
      }
      return { selectedIds, anchorId };
    }

    selectedIds.add(targetId);
    return { selectedIds, anchorId: targetId };
  }

  if (selectedIds.has(targetId)) selectedIds.delete(targetId);
  else selectedIds.add(targetId);
  return { selectedIds, anchorId: targetId };
}
