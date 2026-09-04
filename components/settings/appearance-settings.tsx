"use client";

import { useRef, useState } from "react";
import { SenderAliasInput } from "@/components/mail/sender-alias-input";
import { useMailShell } from "@/components/shell/app-shell";
import { mailFoldersForAccount } from "@/components/shell/sidebar";
import { collectionViewId } from "@/lib/mail/routes";
import { isValidSenderAlias, normalizeSenderAlias } from "@/lib/mail/sender-aliases";
import type { UserPreferences } from "@/lib/preferences";
import {
  ChoiceSetting,
  SettingsActions,
  SettingsCard,
  SettingsField,
  SettingsPage,
  SettingsStatus,
  ToggleSetting,
} from "./settings-ui";

type PreferencePatch = Partial<UserPreferences>;

const themeOptions = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

const densityOptions = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
] as const;

const previewOptions = [
  { value: "hidden", label: "None" },
  { value: "one", label: "One line" },
  { value: "two", label: "Two lines" },
] as const;

export function AppearanceSettings() {
  const { account, collections, preferences, updatePreferences } = useMailShell();
  const requestId = useRef(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: "", error: false });
  const [senderAlias, setSenderAlias] = useState(preferences.defaultSenderAlias);
  const domain = account.email.split("@").at(-1) ?? account.email;
  const folderOptions = [
    ...mailFoldersForAccount(account).map((folder) => ({
      value: folder.id,
      label: folder.label,
    })),
    ...collections
      .filter((collection) => collection.kind === "folder")
      .map((collection) => ({
        value: collectionViewId(collection.id),
        label: collection.name,
      })),
  ];

  async function save(patch: PreferencePatch) {
    const previous = preferences;
    const next = { ...previous, ...patch };
    const id = ++requestId.current;
    updatePreferences(next);
    setSaving(true);
    setStatus({ message: "Saving…", error: false });

    const response = await fetch("/api/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    const json = response
      ? ((await response.json()) as {
          preferences?: UserPreferences;
          error?: string;
        })
      : null;
    if (id !== requestId.current) return;
    setSaving(false);
    if (!response?.ok || !json?.preferences) {
      updatePreferences(previous);
      setStatus({
        message:
          json?.error ??
          "Unable to save this setting. Check your connection and try again.",
        error: true,
      });
      return;
    }
    updatePreferences(json.preferences);
    setStatus({ message: "Settings saved.", error: false });
  }

  return (
    <SettingsPage
      title="Appearance & reading"
      description="Set the theme, message layout, composing defaults, and shortcuts."
    >
      <SettingsCard title="Appearance">
        <ChoiceSetting
          id="theme"
          label="Theme"
          description="Match your device or keep Remail light or dark."
          value={preferences.theme}
          disabled={saving}
          onChange={(value) => void save({ theme: value as UserPreferences["theme"] })}
          options={themeOptions}
        />
        <ChoiceSetting
          id="density"
          label="Message density"
          description="Choose how much space appears between messages."
          value={preferences.density}
          disabled={saving}
          onChange={(value) =>
            void save({ density: value as UserPreferences["density"] })
          }
          options={densityOptions}
        />
      </SettingsCard>

      <SettingsCard title="Composing" overflowVisible>
        <SettingsField
          htmlFor="default-sender-alias"
          label="Default sender"
          hint="The address used when you start a new email. Type only the part before @."
        >
          <SenderAliasInput
            id="default-sender-alias"
            value={senderAlias}
            domain={domain}
            disabled={saving}
            onChange={setSenderAlias}
            onCommit={(value) => {
              const alias = normalizeSenderAlias(value);
              if (alias && !isValidSenderAlias(alias)) {
                setStatus({ message: "Use only characters valid before the @ sign.", error: true });
                return;
              }
              setSenderAlias(alias);
              if (alias !== preferences.defaultSenderAlias) {
                void save({ defaultSenderAlias: alias });
              }
            }}
          />
        </SettingsField>
        <ToggleSetting
          id="redakt-footer"
          label="Add Remail footer"
          description="Include “Sent from Remail” in new messages and replies."
          checked={preferences.includeRedaktFooter}
          disabled={saving}
          onChange={(includeRedaktFooter) => void save({ includeRedaktFooter })}
        />
      </SettingsCard>

      <SettingsCard title="Reading">
        <ChoiceSetting
          id="default-folder"
          label="Default folder"
          description="Choose which folder opens when you launch Remail."
          value={preferences.defaultFolder}
          disabled={saving}
          onChange={(value) =>
            void save({ defaultFolder: value as UserPreferences["defaultFolder"] })
          }
          options={folderOptions}
        />
        <ChoiceSetting
          id="message-preview"
          label="Message preview"
          description="Choose how much of each message appears in the inbox."
          value={preferences.messagePreview}
          disabled={saving}
          onChange={(value) =>
            void save({
              messagePreview: value as UserPreferences["messagePreview"],
            })
          }
          options={previewOptions}
        />
        <ToggleSetting
          id="remote-images"
          label="Load remote images"
          description="Show images without asking first. Remote images can be used for tracking."
          checked={preferences.loadRemoteImages}
          disabled={saving}
          onChange={(loadRemoteImages) => void save({ loadRemoteImages })}
        />
        <ToggleSetting
          id="single-key-shortcuts"
          label="Use single-key shortcuts"
          description="Press / to search, C to compose, W to close the active tab, H/L to switch tabs, J/K or the arrow keys to highlight messages, Space to select, U to toggle read status, Enter to open, R to reply, F to forward, and 1–9 to open sidebar folders. Ctrl/⌘+, opens Settings."
          checked={preferences.singleKeyShortcuts}
          disabled={saving}
          onChange={(singleKeyShortcuts) => void save({ singleKeyShortcuts })}
        />
        {status.message ? (
          <SettingsActions>
            <SettingsStatus message={status.message} error={status.error} />
          </SettingsActions>
        ) : null}
      </SettingsCard>
    </SettingsPage>
  );
}
