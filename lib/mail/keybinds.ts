/**
 * Configurable keyboard shortcuts. Actions may have multiple key combinations.
 * Folder numbers and Escape remain structural rather than configurable.
 */

export type KeyCombo = {
  /** Normalized: single characters are lowercase, others keep `KeyboardEvent.key`. */
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

export const keybindIds = [
  "newEmail",
  "newFolder",
  "toggleTheme",
  "showShortcuts",
  "closeTab",
  "prevTab",
  "nextTab",
  "toggleRead",
  "moveNext",
  "movePrev",
  "openThread",
  "toggleSelect",
  "toggleSelectAll",
  "archive",
  "reply",
  "forward",
  "search",
  "openSettings",
] as const;

export type KeybindId = (typeof keybindIds)[number];

export type KeybindMap = Record<KeybindId, KeyCombo[]>;

export const KEYBIND_GROUPS = ["General", "Tabs", "Conversations"] as const;

export type KeybindGroup = (typeof KEYBIND_GROUPS)[number];

export const KEYBIND_ACTIONS: ReadonlyArray<{
  id: KeybindId;
  label: string;
  group: KeybindGroup;
}> = [
  { id: "newEmail", label: "New email", group: "General" },
  { id: "newFolder", label: "New folder", group: "General" },
  { id: "toggleTheme", label: "Toggle light / dark theme", group: "General" },
  { id: "showShortcuts", label: "Show keyboard shortcuts", group: "General" },
  { id: "search", label: "Search mail", group: "General" },
  { id: "openSettings", label: "Open settings", group: "General" },
  { id: "prevTab", label: "Previous tab", group: "Tabs" },
  { id: "nextTab", label: "Next tab", group: "Tabs" },
  { id: "closeTab", label: "Close tab", group: "Tabs" },
  { id: "movePrev", label: "Previous conversation", group: "Conversations" },
  { id: "moveNext", label: "Next conversation", group: "Conversations" },
  { id: "openThread", label: "Open conversation", group: "Conversations" },
  { id: "toggleSelect", label: "Select conversation", group: "Conversations" },
  { id: "toggleSelectAll", label: "Select visible conversations", group: "Conversations" },
  { id: "toggleRead", label: "Toggle read / unread", group: "Conversations" },
  { id: "reply", label: "Reply", group: "Conversations" },
  { id: "forward", label: "Forward", group: "Conversations" },
  { id: "archive", label: "Archive", group: "Conversations" },
];

function combo(key: string, mods?: Partial<Omit<KeyCombo, "key">>): KeyCombo {
  return {
    key,
    ctrl: mods?.ctrl ?? false,
    alt: mods?.alt ?? false,
    shift: mods?.shift ?? false,
    meta: mods?.meta ?? false,
  };
}

export const DEFAULT_KEYBINDS: KeybindMap = {
  newEmail: [combo("c"), combo("n", { alt: true })],
  newFolder: [combo("n")],
  toggleTheme: [combo("t")],
  showShortcuts: [combo("k", { ctrl: true })],
  closeTab: [combo("q")],
  prevTab: [combo("h"), combo("ArrowLeft")],
  nextTab: [combo("l"), combo("ArrowRight")],
  toggleRead: [combo("u")],
  moveNext: [combo("j"), combo("ArrowDown")],
  movePrev: [combo("k"), combo("ArrowUp")],
  openThread: [combo("Enter")],
  toggleSelect: [combo(" ")],
  toggleSelectAll: [combo("a", { ctrl: true })],
  reply: [combo("r")],
  forward: [combo("f")],
  archive: [combo("a")],
  search: [combo("/")],
  openSettings: [combo(",", { ctrl: true })],
};

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function normalizeKeyCombo(value: unknown): KeyCombo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.key !== "string" || !input.key || input.key.length > 24) {
    return null;
  }
  for (const mod of ["ctrl", "alt", "shift", "meta"] as const) {
    if (input[mod] !== undefined && typeof input[mod] !== "boolean") return null;
  }
  return {
    key: normalizeKey(input.key),
    ctrl: input.ctrl === true,
    alt: input.alt === true,
    shift: input.shift === true,
    meta: input.meta === true,
  };
}

export function normalizeKeybinds(value: unknown): KeybindMap {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    keybindIds.map((id) => {
      const stored = input[id];
      const normalized = Array.isArray(stored)
        ? stored.map(normalizeKeyCombo).filter((item): item is KeyCombo => item !== null)
        : [normalizeKeyCombo(stored)].filter((item): item is KeyCombo => item !== null);
      return [id, normalized.length > 0 ? normalized : DEFAULT_KEYBINDS[id]];
    }),
  ) as KeybindMap;
}

type KeyEventLike = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

export function comboMatchesEvent(event: KeyEventLike, combo: KeyCombo): boolean {
  if (normalizeKey(event.key) !== normalizeKey(combo.key)) return false;
  // Ctrl+key bindings also accept Cmd on macOS, matching platform convention.
  if (combo.ctrl && !combo.meta) {
    if (!event.ctrlKey && !event.metaKey) return false;
  } else {
    if (event.ctrlKey !== combo.ctrl || event.metaKey !== combo.meta) return false;
  }
  return event.altKey === combo.alt && event.shiftKey === combo.shift;
}

export function keybindMatchesEvent(
  event: KeyEventLike,
  bindings: readonly KeyCombo[],
): boolean {
  return bindings.some((binding) => comboMatchesEvent(event, binding));
}

export function enabledKeybindMatchesEvent(
  event: KeyEventLike,
  bindings: readonly KeyCombo[],
  singleKeyShortcuts: boolean,
): boolean {
  if (!keybindMatchesEvent(event, bindings)) return false;
  return (
    singleKeyShortcuts ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.key.length > 1 ||
    event.key === " "
  );
}

export function combosEqual(a: KeyCombo, b: KeyCombo): boolean {
  return (
    normalizeKey(a.key) === normalizeKey(b.key) &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta
  );
}

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];
  // Ctrl bindings also accept ⌘ on macOS.
  if (combo.ctrl && !combo.meta) parts.push("Ctrl/⌘");
  else if (combo.ctrl) parts.push("Ctrl");
  if (combo.meta) parts.push("⌘");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  const key = KEY_LABELS[combo.key] ?? combo.key.toUpperCase();
  parts.push(key);
  return parts.join(" + ");
}
