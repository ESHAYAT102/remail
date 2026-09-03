export const collectionIconOptions = [
  { id: "star", label: "Star" },
  { id: "pin", label: "Pin" },
  { id: "clock", label: "Clock" },
  { id: "calendar", label: "Calendar" },
  { id: "inbox", label: "Inbox" },
  { id: "mail", label: "Mail" },
  { id: "archive", label: "Archive" },
  { id: "tag", label: "Tag" },
  { id: "briefcase", label: "Briefcase" },
  { id: "home", label: "Home" },
  { id: "users", label: "People" },
  { id: "user", label: "Person" },
  { id: "heart", label: "Heart" },
  { id: "cloud", label: "Cloud" },
  { id: "code", label: "Code" },
  { id: "globe", label: "Globe" },
  { id: "shield", label: "Shield" },
  { id: "key", label: "Key" },
  { id: "settings", label: "Settings" },
  { id: "brush", label: "Brush" },
  { id: "camera", label: "Camera" },
  { id: "chart", label: "Chart" },
  { id: "rocket", label: "Rocket" },
  { id: "target", label: "Target" },
  { id: "idea", label: "Idea" },
  { id: "coffee", label: "Coffee" },
  { id: "music", label: "Music" },
  { id: "link", label: "Link" },
  { id: "attachment", label: "Attachment" },
  { id: "file", label: "File" },
  { id: "task", label: "Task" },
  { id: "sparkles", label: "Sparkles" },
] as const;

export type CollectionIconName = (typeof collectionIconOptions)[number]["id"];

export type CollectionAppearance = {
  icon: CollectionIconName;
  color: string;
};

export const defaultCollectionAppearance: CollectionAppearance = {
  icon: "star",
  color: "#858b94",
};

export const collectionColorOptions = [
  { value: "#858b94", label: "Gray" },
  { value: "#d76565", label: "Red" },
  { value: "#d9788b", label: "Rose" },
  { value: "#df8756", label: "Orange" },
  { value: "#c9a34f", label: "Gold" },
  { value: "#91ad55", label: "Lime" },
  { value: "#67a979", label: "Green" },
  { value: "#57a7a1", label: "Teal" },
  { value: "#52a9c2", label: "Cyan" },
  { value: "#6595cf", label: "Blue" },
  { value: "#6f7dc9", label: "Indigo" },
  { value: "#8b7bd1", label: "Violet" },
  { value: "#a66fc2", label: "Purple" },
  { value: "#c574ad", label: "Pink" },
  { value: "#9b7a63", label: "Brown" },
] as const;

const collectionIconNames = new Set<string>(
  collectionIconOptions.map((option) => option.id),
);
const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function normalizeCollectionIcon(
  value: unknown,
): CollectionIconName | null {
  return typeof value === "string" && collectionIconNames.has(value)
    ? (value as CollectionIconName)
    : null;
}

export function normalizeCollectionColor(value: unknown) {
  return typeof value === "string" && hexColorPattern.test(value)
    ? value.toLowerCase()
    : null;
}
