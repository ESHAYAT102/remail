export type ThreadDropTarget =
  | { type: "collection"; collectionId: string }
  | { type: "archive" }
  | { type: "unread" }
  | { type: "move"; destination: "inbox" | "spam" | "trash" };

export function threadDropTargetKey(target: ThreadDropTarget) {
  if (target.type === "collection") {
    return `collection:${target.collectionId}`;
  }
  if (target.type === "archive") return "archive";
  if (target.type === "unread") return "unread";
  return `move:${target.destination}`;
}

export function parseThreadDropTargetKey(
  value: string | undefined,
): ThreadDropTarget | null {
  if (!value) return null;
  if (value === "archive") return { type: "archive" };
  if (value === "unread") return { type: "unread" };
  if (value === "move:inbox") {
    return { type: "move", destination: "inbox" };
  }
  if (value === "move:spam") {
    return { type: "move", destination: "spam" };
  }
  if (value === "move:trash") {
    return { type: "move", destination: "trash" };
  }
  if (value.startsWith("collection:") && value.length > "collection:".length) {
    return {
      type: "collection",
      collectionId: value.slice("collection:".length),
    };
  }
  return null;
}
