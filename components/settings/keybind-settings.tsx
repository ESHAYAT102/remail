"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useMailShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  combosEqual,
  DEFAULT_KEYBINDS,
  formatKeyCombo,
  KEYBIND_ACTIONS,
  KEYBIND_GROUPS,
  normalizeKey,
  type KeybindId,
  type KeybindMap,
  type KeyCombo,
} from "@/lib/mail/keybinds";
import type { UserPreferences } from "@/lib/preferences";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import {
  SettingsActions,
  SettingsCard,
  SettingsPage,
  SettingsStatus,
} from "./settings-ui";

const styles = stylex.create({
  tableWrap: { width: "100%", overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  heading: {
    paddingBlock: space[3],
    paddingInline: space[5],
    color: colors.textFaint,
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    fontWeight: 600,
    letterSpacing: fonts.microTrack,
    textAlign: "start",
    textTransform: "uppercase",
    "@media (max-width: 640px)": { paddingInline: space[3] },
  },
  actionColumn: { width: "45%" },
  bindingColumn: { width: "30%" },
  editColumn: { width: "25%", textAlign: "end" },
  group: {
    paddingBlockStart: space[4],
    paddingBlockEnd: space[2],
    paddingInline: space[5],
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    color: colors.textMuted,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 600,
    textAlign: "start",
    "@media (max-width: 640px)": { paddingInline: space[3] },
  },
  cell: {
    height: 52,
    paddingBlock: space[2],
    paddingInline: space[5],
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    textAlign: "start",
    "@media (max-width: 640px)": { paddingInline: space[3] },
  },
  binding: {
    display: "inline-flex",
    minHeight: 28,
    alignItems: "center",
    paddingInline: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceActive,
    color: colors.text,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    whiteSpace: "nowrap",
  },
  bindingButton: {
    borderWidth: 0,
    cursor: "pointer",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    ":disabled": { cursor: "not-allowed", opacity: 0.55 },
  },
  bindings: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space[1],
  },
  listening: { color: colors.accentText },
  controls: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: space[1],
  },
  footer: {
    paddingBlock: space[4],
    paddingInline: space[5],
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    textAlign: "end",
    "@media (max-width: 640px)": { paddingInline: space[3] },
  },
  note: {
    margin: 0,
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift"]);

function comboFromEvent(event: KeyboardEvent): KeyCombo {
  return {
    key: normalizeKey(event.key),
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

export function KeybindSettings() {
  const { preferences, updatePreferences } = useMailShell();
  const [editing, setEditing] = useState<KeybindId | null>(null);
  const [pending, setPending] = useState<KeyCombo | null>(null);
  const [draft, setDraft] = useState<KeyCombo[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: "", error: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  function cancelTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  async function saveKeybinds(keybinds: KeybindMap, message: string) {
    const previous = preferences;
    const next = { ...previous, keybinds };
    const id = ++requestId.current;
    updatePreferences(next);
    setSaving(true);
    setStatus({ message: "Saving...", error: false });

    const response = await fetch("/api/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keybinds }),
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
          "Unable to save shortcuts. Check your connection and try again.",
        error: true,
      });
      return;
    }
    updatePreferences(json.preferences);
    setStatus({ message, error: false });
  }

  function saveBindings(id: KeybindId, bindings: KeyCombo[]) {
    cancelTimer();
    if (bindings.length === 0) {
      setStatus({ message: "Keep at least one shortcut for this action.", error: true });
      return;
    }
    const duplicate = KEYBIND_ACTIONS.find((action) =>
      action.id !== id &&
      preferences.keybinds[action.id].some((existing) =>
        bindings.some((binding) => combosEqual(existing, binding)),
      ),
    );
    if (duplicate) {
      setStatus({
        message: `That shortcut is already assigned to ${duplicate.label}.`,
        error: true,
      });
      return;
    }
    setEditing(null);
    setPending(null);
    setDraft(null);
    void saveKeybinds(
      { ...preferences.keybinds, [id]: bindings },
      "Shortcuts saved.",
    );
  }

  const captureKey = useEffectEvent((event: KeyboardEvent) => {
    if (!editing) return;
    if (event.key === "Tab") return;
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof Element &&
      event.target.closest("button")
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      cancelTimer();
      setEditing(null);
      setPending(null);
      setDraft(null);
      setStatus({ message: "Edit canceled.", error: false });
      return;
    }
    if (MODIFIER_KEYS.has(event.key)) return;

    const combo = comboFromEvent(event);
    const current = draft ?? preferences.keybinds[editing];
    const alreadyAssigned = KEYBIND_ACTIONS.find(
      (action) =>
        action.id !== editing &&
        preferences.keybinds[action.id].some((binding) =>
          combosEqual(binding, combo),
        ),
    );
    if (alreadyAssigned) {
      setStatus({
        message: `That shortcut is already assigned to ${alreadyAssigned.label}.`,
        error: true,
      });
      return;
    }
    const next = current.some((binding) => combosEqual(binding, combo))
      ? current
      : [...current, combo];
    setPending(combo);
    setDraft(next);
    setStatus({ message: "Shortcut captured. Saving in one second...", error: false });
    cancelTimer();
    if (
      event.key === "Enter" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      saveBindings(editing, next);
      return;
    }
    timer.current = setTimeout(() => saveBindings(editing, next), 1000);
  });

  useEffect(() => {
    if (!editing) return;
    const capture = (event: KeyboardEvent) => captureKey(event);
    window.addEventListener("keydown", capture, true);
    return () => {
      window.removeEventListener("keydown", capture, true);
      cancelTimer();
    };
  }, [editing]);

  return (
    <SettingsPage
      title="Keyboard shortcuts"
      description="Each action can use more than one binding. By default, Ctrl/⌘+K opens the shortcut reference, C or Alt+N starts an email, T switches themes, H/L or Left/Right switches tabs, and J/K or Up/Down moves between conversations."
    >
      <SettingsCard title="Bindings">
        <div {...stylex.props(styles.tableWrap)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th scope="col" {...stylex.props(styles.heading, styles.actionColumn)}>Action</th>
                <th scope="col" {...stylex.props(styles.heading, styles.bindingColumn)}>Binding</th>
                <th scope="col" {...stylex.props(styles.heading, styles.editColumn)}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {KEYBIND_GROUPS.map((group) => (
                <KeybindGroup
                  key={group}
                  group={group}
                  editing={editing}
                  pending={pending}
                  draft={draft}
                  keybinds={preferences.keybinds}
                  saving={saving}
                  onEdit={(id) => {
                    cancelTimer();
                    setEditing(id);
                    setPending(null);
                    setDraft([...preferences.keybinds[id]]);
                    setStatus({ message: "Press the shortcut you want to use.", error: false });
                  }}
                  onRemove={(binding) => {
                    cancelTimer();
                    setPending(null);
                    setDraft((current) =>
                      current?.filter((item) => !combosEqual(item, binding)) ?? null,
                    );
                    setStatus({ message: "Binding removed. Select Save to apply.", error: false });
                  }}
                  onSave={(id) => draft && saveBindings(id, draft)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} {...stylex.props(styles.footer)}>
                  <Button
                    type="button"
                    variant="soft"
                    disabled={saving}
                    onClick={() => {
                      cancelTimer();
                      setEditing(null);
                      setPending(null);
                      setDraft(null);
                      void saveKeybinds(DEFAULT_KEYBINDS, "Shortcuts reset.");
                    }}
                  >
                    Reset all
                  </Button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <SettingsActions>
          <p {...stylex.props(styles.note)}>Press Escape while editing to cancel.</p>
          <SettingsStatus message={status.message} error={status.error} />
        </SettingsActions>
      </SettingsCard>
    </SettingsPage>
  );
}

function KeybindGroup({
  group,
  editing,
  pending,
  draft,
  keybinds,
  saving,
  onEdit,
  onRemove,
  onSave,
}: {
  group: (typeof KEYBIND_GROUPS)[number];
  editing: KeybindId | null;
  pending: KeyCombo | null;
  draft: KeyCombo[] | null;
  keybinds: KeybindMap;
  saving: boolean;
  onEdit: (id: KeybindId) => void;
  onRemove: (binding: KeyCombo) => void;
  onSave: (id: KeybindId) => void;
}) {
  return (
    <>
      <tr>
        <th colSpan={3} scope="rowgroup" {...stylex.props(styles.group)}>{group}</th>
      </tr>
      {KEYBIND_ACTIONS.filter((action) => action.group === group).map((action) => {
        const isEditing = editing === action.id;
        return (
          <tr key={action.id}>
            <th scope="row" {...stylex.props(styles.cell)}>{action.label}</th>
            <td {...stylex.props(styles.cell)}>
              <div {...stylex.props(styles.bindings)}>
                {(isEditing ? draft ?? [] : keybinds[action.id]).map((binding) =>
                  isEditing ? (
                    <button
                      key={formatKeyCombo(binding)}
                      type="button"
                      disabled={(draft?.length ?? 0) <= 1}
                      aria-label={`Remove ${formatKeyCombo(binding)}`}
                      title="Remove binding"
                      onClick={() => onRemove(binding)}
                      {...stylex.props(styles.binding, styles.bindingButton)}
                    >
                      {formatKeyCombo(binding)} ×
                    </button>
                  ) : (
                    <span key={formatKeyCombo(binding)} {...stylex.props(styles.binding)}>
                      {formatKeyCombo(binding)}
                    </span>
                  ),
                )}
                {isEditing && !pending ? (
                  <span {...stylex.props(styles.binding, styles.listening)}>Press keys...</span>
                ) : null}
              </div>
            </td>
            <td {...stylex.props(styles.cell)}>
              <div {...stylex.props(styles.controls)}>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="solid"
                    disabled={!draft || draft.length === 0 || saving}
                    onClick={() => onSave(action.id)}
                  >
                    Save
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={saving || editing !== null}
                    aria-label={`Edit ${action.label} shortcut`}
                    onClick={() => onEdit(action.id)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
