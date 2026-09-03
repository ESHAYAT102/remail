"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { CollectionIcon } from "@/components/mail/collection-icon";
import { FolderMark } from "@/components/mail/folder-mark";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Popover } from "@/components/ui/popover";
import {
  collectionColorOptions,
  collectionIconOptions,
  defaultCollectionAppearance,
  type CollectionIconName,
} from "@/lib/mail/collection-appearance";
import { MAX_COLLECTION_NAME_LENGTH } from "@/lib/mail/collections";
import {
  collectionViewId,
  mailFolderHref,
} from "@/lib/mail/routes";
import type {
  MailCollection,
  MailCollectionKind,
} from "@/lib/mail/types";
import {
  colors,
  elevation,
  fonts,
  radius,
  space,
} from "@/theme/tokens.stylex";

const styles = stylex.create({
  popup: {
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  nameRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 44px",
    alignItems: "end",
    gap: space[3],
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  label: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  input: {
    width: "100%",
    minHeight: 36,
    paddingInline: space[3],
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    outline: "none",
    ":disabled": { cursor: "not-allowed", opacity: 0.45 },
    "[aria-invalid='true']": {
      outlineWidth: 1,
      outlineStyle: "solid",
      outlineColor: colors.danger,
      outlineOffset: -1,
    },
    "@media (max-width: 640px)": { fontSize: "16px !important" },
  },
  appearanceTrigger: {
    display: "flex",
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    cursor: "pointer",
    outline: "none",
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
    ":disabled": { cursor: "not-allowed", opacity: 0.45 },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover },
    },
  },
  appearance: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  appearanceTitle: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 550,
  },
  optionGroup: {
    minWidth: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
  },
  optionLegend: {
    marginBlockEnd: space[2],
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  colorOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 32px)",
    gap: 3,
  },
  choice: {
    position: "relative",
    display: "inline-flex",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    ":focus-within": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.accent,
      outlineOffset: 1,
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
    "@media (max-width: 640px)": {
      width: 44,
      height: 44,
    },
  },
  choiceSelected: {
    backgroundColor: colors.surfaceActive,
    boxShadow: elevation.control,
    color: colors.text,
  },
  colorChoice: {
    "@media (max-width: 640px)": {
      width: 32,
      height: 32,
    },
  },
  hiddenControl: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-1) 10%, transparent)",
  },
  customColorSwatch: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage:
      "conic-gradient(#e85d75, #e7ad4d, #68b57b, #58b8b2, #6595cf, #9178d5, #d16caf, #e85d75)",
  },
  customColorValue: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.surface,
    borderRadius: radius.full,
  },
  customColorControl: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  iconOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 32px)",
    gap: space[1],
    "@media (max-width: 640px)": {
      gridTemplateColumns: "repeat(5, 44px)",
    },
  },
  status: {
    minHeight: fonts.uiLine,
    marginBlockStart: space[2],
    color: colors.danger,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[2],
    marginBlockStart: space[3],
  },
});

type CollectionDialogProps = {
  accountId: string;
  kind: MailCollectionKind;
  collection?: MailCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CollectionDialog({
  accountId,
  kind,
  collection,
  open,
  onOpenChange,
}: CollectionDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [icon, setIcon] = useState<CollectionIconName>(
    collection?.icon ?? defaultCollectionAppearance.icon,
  );
  const [color, setColor] = useState(
    collection?.color ?? defaultCollectionAppearance.color,
  );
  const editing = Boolean(collection);
  const term = kind === "label" ? "label" : "folder";
  const fieldPrefix = `${editing ? "edit" : "new"}-${term}`;
  const hasPresetColor = collectionColorOptions.some(
    (option) => option.value === color,
  );

  const resetForm = () => {
    formRef.current?.reset();
    setIcon(collection?.icon ?? defaultCollectionAppearance.icon);
    setColor(collection?.color ?? defaultCollectionAppearance.color);
  };

  const changeOpen = (next: boolean) => {
    if (busy) return;
    if (!next) {
      setError("");
      resetForm();
    }
    onOpenChange(next);
  };

  const popup = stylex.props(styles.popup);

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          initialFocus={inputRef}
          className={popup.className}
          style={popup.style}
        >
          <form
            ref={formRef}
            {...stylex.props(styles.form)}
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const name = String(form.get("name") ?? "").trim();
              if (!name) {
                setError(`Enter a ${term} name.`);
                requestAnimationFrame(() => inputRef.current?.focus());
                return;
              }
              setBusy(true);
              setError("");
              const response = await fetch(
                collection
                  ? `/api/mail/collections/${encodeURIComponent(collection.id)}?account=${encodeURIComponent(accountId)}`
                  : `/api/mail/collections?account=${encodeURIComponent(accountId)}`,
                {
                  method: collection ? "PATCH" : "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    ...(kind === "folder" ? { icon, color } : {}),
                  }),
                },
              ).catch(() => null);
              if (!response?.ok) {
                const result = response
                  ? ((await response.json().catch(() => null)) as {
                      error?: string;
                    } | null)
                  : null;
                setError(
                  result?.error ??
                    `Unable to ${editing ? "save" : "create"} this ${term}. Check your connection and try again.`,
                );
                setBusy(false);
                requestAnimationFrame(() => {
                  inputRef.current?.focus();
                  inputRef.current?.select();
                });
                return;
              }
              const result = (await response.json()) as {
                collection: MailCollection;
              };
              setBusy(false);
              setError("");
              resetForm();
              onOpenChange(false);
              if (!collection) {
                router.push(
                  mailFolderHref(
                    collectionViewId(result.collection.id),
                    undefined,
                    accountId,
                  ),
                );
              }
              router.refresh();
            }}
          >
            <Dialog.Title>{editing ? "Edit" : "Create"} {term}</Dialog.Title>
            <Dialog.Description>
              {editing
                ? kind === "label"
                  ? "Rename this label."
                  : "Rename this folder or change how it appears in Remail."
                : kind === "label"
                  ? "Labels group related conversations without moving them out of their current mailbox."
                  : "Folders move conversations out of their current mailbox into a place you choose."}
            </Dialog.Description>
            <div {...stylex.props(kind === "folder" && styles.nameRow)}>
              <div {...stylex.props(styles.field)}>
                <label
                  htmlFor={`${fieldPrefix}-name`}
                  {...stylex.props(styles.label)}
                >
                  Name
                </label>
                <input
                  ref={inputRef}
                  id={`${fieldPrefix}-name`}
                  name="name"
                  type="text"
                  defaultValue={collection?.name}
                  autoComplete="off"
                  maxLength={MAX_COLLECTION_NAME_LENGTH}
                  disabled={busy}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? `${fieldPrefix}-error` : undefined}
                  {...stylex.props(styles.input)}
                />
              </div>
              {kind === "folder" ? (
                <Popover.Root>
                  <Popover.Trigger
                    render={
                      <button
                        type="button"
                        aria-label="Choose folder appearance"
                        disabled={busy}
                        {...stylex.props(styles.appearanceTrigger)}
                      />
                    }
                  >
                    <FolderMark color={color} icon={icon} size="preview" />
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={8} align="end">
                      <Popover.Popup>
                        <div {...stylex.props(styles.appearance)}>
                          <Popover.Title {...stylex.props(styles.appearanceTitle)}>
                            Folder appearance
                          </Popover.Title>
                          <fieldset
                            disabled={busy}
                            {...stylex.props(styles.optionGroup)}
                          >
                            <legend {...stylex.props(styles.optionLegend)}>
                              Color
                            </legend>
                            <div {...stylex.props(styles.colorOptions)}>
                              {collectionColorOptions.map((option) => {
                                const selected = color === option.value;
                                return (
                                  <label
                                    key={option.value}
                                    title={option.label}
                                    {...stylex.props(
                                      styles.choice,
                                      styles.colorChoice,
                                      selected && styles.choiceSelected,
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="folder-color"
                                      value={option.value}
                                      checked={selected}
                                      onChange={() => setColor(option.value)}
                                      aria-label={option.label}
                                      {...stylex.props(styles.hiddenControl)}
                                    />
                                    <span
                                      aria-hidden="true"
                                      {...stylex.props(styles.colorSwatch)}
                                      style={{ backgroundColor: option.value }}
                                    />
                                  </label>
                                );
                              })}
                              <label
                                title="Custom color"
                                {...stylex.props(
                                  styles.choice,
                                  styles.colorChoice,
                                  !hasPresetColor && styles.choiceSelected,
                                )}
                              >
                                <input
                                  type="color"
                                  value={color}
                                  onChange={(event) =>
                                    setColor(event.currentTarget.value)
                                  }
                                  aria-label="Custom color"
                                  {...stylex.props(styles.customColorControl)}
                                />
                                <span
                                  aria-hidden="true"
                                  {...stylex.props(
                                    styles.colorSwatch,
                                    styles.customColorSwatch,
                                  )}
                                >
                                  <span
                                    {...stylex.props(styles.customColorValue)}
                                    style={{ backgroundColor: color }}
                                  />
                                </span>
                              </label>
                            </div>
                          </fieldset>
                          <fieldset
                            disabled={busy}
                            {...stylex.props(styles.optionGroup)}
                          >
                            <legend {...stylex.props(styles.optionLegend)}>
                              Icon
                            </legend>
                            <div {...stylex.props(styles.iconOptions)}>
                              {collectionIconOptions.map((option) => {
                                const selected = icon === option.id;
                                return (
                                  <label
                                    key={option.id}
                                    title={option.label}
                                    {...stylex.props(
                                      styles.choice,
                                      selected && styles.choiceSelected,
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="folder-icon"
                                      value={option.id}
                                      checked={selected}
                                      onChange={() => setIcon(option.id)}
                                      aria-label={option.label}
                                      {...stylex.props(styles.hiddenControl)}
                                    />
                                    <CollectionIcon
                                      name={option.id}
                                      size={16}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        </div>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              ) : null}
            </div>
            <p
              id={`${fieldPrefix}-error`}
              role={error ? "alert" : undefined}
              {...stylex.props(styles.status)}
            >
              {error}
            </p>
            <div {...stylex.props(styles.actions)}>
              <Dialog.Close
                render={
                  <Button type="button" variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={busy}>
                {busy
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                    ? "Save changes"
                    : `Create ${term}`}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CreateCollectionDialog(
  props: Omit<CollectionDialogProps, "collection">,
) {
  return <CollectionDialog {...props} />;
}

export function EditCollectionDialog({
  accountId,
  collection,
  open,
  onOpenChange,
}: {
  accountId: string;
  collection: MailCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <CollectionDialog
      key={`${collection.id}:${collection.name}:${collection.icon}:${collection.color}`}
      accountId={accountId}
      kind={collection.kind}
      collection={collection}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
