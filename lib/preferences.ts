export const themePreferences = ["system", "light", "dark"] as const;
export const densityPreferences = ["comfortable", "compact"] as const;
export const messagePreviewPreferences = ["hidden", "one", "two"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type DensityPreference = (typeof densityPreferences)[number];
export type MessagePreviewPreference = (typeof messagePreviewPreferences)[number];

export type UserPreferences = {
  theme: ThemePreference;
  density: DensityPreference;
  loadRemoteImages: boolean;
  includeRedaktFooter: boolean;
  singleKeyShortcuts: boolean;
  messagePreview: MessagePreviewPreference;
};

export const defaultUserPreferences: UserPreferences = {
  theme: "system",
  density: "comfortable",
  loadRemoteImages: true,
  includeRedaktFooter: true,
  singleKeyShortcuts: true,
  messagePreview: "one",
};

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function normalizeUserPreferences(
  value?: Partial<Record<keyof UserPreferences, unknown>> | null,
): UserPreferences {
  return {
    theme: includes(themePreferences, value?.theme)
      ? value.theme
      : defaultUserPreferences.theme,
    density: includes(densityPreferences, value?.density)
      ? value.density
      : defaultUserPreferences.density,
    loadRemoteImages:
      typeof value?.loadRemoteImages === "boolean"
        ? value.loadRemoteImages
        : defaultUserPreferences.loadRemoteImages,
    includeRedaktFooter:
      typeof value?.includeRedaktFooter === "boolean"
        ? value.includeRedaktFooter
        : defaultUserPreferences.includeRedaktFooter,
    singleKeyShortcuts:
      typeof value?.singleKeyShortcuts === "boolean"
        ? value.singleKeyShortcuts
        : defaultUserPreferences.singleKeyShortcuts,
    messagePreview: includes(messagePreviewPreferences, value?.messagePreview)
      ? value.messagePreview
      : defaultUserPreferences.messagePreview,
  };
}

export function parseUserPreferencesPatch(value: unknown): Partial<UserPreferences> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Choose a valid setting.");
  }

  const input = value as Record<string, unknown>;
  const allowed = new Set<keyof UserPreferences>([
    "theme",
    "density",
    "loadRemoteImages",
    "includeRedaktFooter",
    "singleKeyShortcuts",
    "messagePreview",
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key as keyof UserPreferences))) {
    throw new Error("Choose a valid setting.");
  }

  const patch: Partial<UserPreferences> = {};
  if ("theme" in input) {
    if (!includes(themePreferences, input.theme)) throw new Error("Choose a valid theme.");
    patch.theme = input.theme;
  }
  if ("density" in input) {
    if (!includes(densityPreferences, input.density)) {
      throw new Error("Choose a valid message density.");
    }
    patch.density = input.density;
  }
  if ("loadRemoteImages" in input) {
    if (typeof input.loadRemoteImages !== "boolean") {
      throw new Error("Choose whether remote images load.");
    }
    patch.loadRemoteImages = input.loadRemoteImages;
  }
  if ("includeRedaktFooter" in input) {
    if (typeof input.includeRedaktFooter !== "boolean") {
      throw new Error("Choose whether to add the Remail footer.");
    }
    patch.includeRedaktFooter = input.includeRedaktFooter;
  }
  if ("singleKeyShortcuts" in input) {
    if (typeof input.singleKeyShortcuts !== "boolean") {
      throw new Error("Choose whether to use single-key shortcuts.");
    }
    patch.singleKeyShortcuts = input.singleKeyShortcuts;
  }
  if ("messagePreview" in input) {
    if (!includes(messagePreviewPreferences, input.messagePreview)) {
      throw new Error("Choose a valid message preview.");
    }
    patch.messagePreview = input.messagePreview;
  }

  if (Object.keys(patch).length === 0) throw new Error("Choose a setting to update.");
  return patch;
}
