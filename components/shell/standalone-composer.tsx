"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import * as stylex from "@stylexjs/stylex";
import { SenderField } from "@/components/mail/sender-alias-input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import {
  RichTextComposer,
  RichTextEditor,
  RichTextToolbar,
} from "@/components/mail/rich-text-editor";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { hasAuthoredComposeText } from "@/lib/mail/composer-footer";
import type { ComposeInput } from "@/lib/mail/types";
import { persistDraft, removeDraft } from "@/lib/mail/draft-client";
import { useFileDrop } from "./use-file-drop";

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "oklch(0 0 0 / 0.56)",
    overscrollBehavior: "contain",
  },
  popup: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    width: "min(640px, calc(100vw - 32px))",
    height: "min(560px, calc(100dvh - 48px))",
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    borderRadius: radius["2xl"],
    boxShadow: elevation.overlay,
    outline: "none",
    overflow: "hidden",
    overscrollBehavior: "contain",
    zIndex: 40,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity, transform, width, height",
      transitionDuration: "180ms",
      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    },
    "[data-starting-style]": {
      opacity: 0,
      transform: "translate(-50%, calc(-50% + 8px))",
    },
    "[data-ending-style]": {
      opacity: 0,
      transform: "translate(-50%, calc(-50% + 6px))",
    },
  },
  popupExpanded: {
    width: "min(960px, calc(100vw - 24px))",
    height: "calc(100dvh - 24px)",
  },
  chrome: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    gap: space[3],
    paddingInline: space[5],
    paddingBlockStart: space[3],
    paddingBlockEnd: space[1],
    flexShrink: 0,
    "@media (max-width: 640px)": {
      paddingInline: space[4],
    },
  },
  recipients: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: space[2],
  },
  windowActions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    paddingBlockStart: 2,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    paddingInline: space[5],
    paddingBlockEnd: space[4],
    position: "relative",
    "@media (max-width: 640px)": {
      paddingInline: space[4],
    },
  },
  dropOverlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    inset: 0,
    margin: space[4],
    borderRadius: radius.xl,
    backgroundColor: "oklch(0 0 0 / 0.08)",
    border: `2px dashed ${colors.accent}`,
    pointerEvents: "none",
    zIndex: 10,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    color: colors.accent,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minHeight: 36,
  },
  label: {
    flexShrink: 0,
    width: 28,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    fontWeight: 500,
  },
  chips: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingBlock: space[1],
    paddingInline: space[3],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ":focus-within": {
      borderColor: colors.textMuted,
      outline: "none",
      boxShadow: "none",
    },
    "@media (max-width: 640px)": {
      minHeight: 44,
    },
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    height: 24,
    paddingInlineStart: space[2],
    paddingInlineEnd: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    color: colors.text,
    fontSize: fonts.captionSize,
  },
  chipText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chipRemove: {
    position: "relative",
    width: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderRadius: radius.full,
    backgroundColor: "transparent",
    color: colors.textFaint,
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    "::before": {
      content: "",
      position: "absolute",
      insetBlock: -4,
      insetInline: -4,
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text, backgroundColor: colors.surfaceHover },
    },
  },
  field: {
    flex: 1,
    minWidth: 80,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.text,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    minHeight: 30,
    paddingBlock: space[1],
    outline: "none",
    ":focus-visible": { outline: "none" },
    "@media (max-width: 640px)": {
      fontSize: "16px",
    },
  },
  chevron: {
    width: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    flexShrink: 0,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform",
      transitionDuration: "150ms",
    },
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  messageWrap: {
    flex: 1,
    minHeight: 0,
    display: "flex",
  },
  subjectWrap: {
    fontSize: fonts.titleSize,
    lineHeight: fonts.titleLine,
    fontWeight: 600,
    paddingBlockStart: space[4],
    paddingBlockEnd: space[4],
  },
  subject: {
    width: "100%",
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.text,
    font: "inherit",
    outline: "none",
  },
  message: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    resize: "none",
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.text,
    fontFamily: "inherit",
    fontSize: fonts.bodySize,
    lineHeight: fonts.bodyLine,
    outline: "none",
    "@media (max-width: 640px)": {
      fontSize: "16px",
    },
  },
  placeholder: {
    "::placeholder": {
      color: colors.textFaint,
      fontWeight: 450,
    },
  },
  attachments: {
    display: "flex",
    flexWrap: "wrap",
    gap: space[2],
    paddingBlockStart: space[3],
  },
  file: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    height: 36,
    maxWidth: "100%",
    paddingInlineStart: 4,
    paddingInlineEnd: space[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHover,
    borderWidth: 0,
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    cursor: "default",
    fontFamily: "inherit",
    textAlign: "start",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceActive },
    },
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 24,
    paddingInline: 6,
    borderRadius: 6,
    color: "oklch(0.99 0 0)",
    fontSize: fonts.microSize,
    fontWeight: 650,
    letterSpacing: fonts.microTrack,
    textTransform: "uppercase",
  },
  fileMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: space[2],
    minWidth: 0,
  },
  fileName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.captionSize,
    color: colors.text,
  },
  fileSize: {
    flexShrink: 0,
    fontSize: fonts.microSize,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  foot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    paddingInline: space[5],
    paddingBlock: space[4],
    flexWrap: "wrap",
    "@media (max-width: 640px)": {
      paddingInline: space[4],
    },
  },
  tools: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  },
  error: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.text,
    textWrap: "pretty",
    paddingBlockStart: space[2],
    paddingInline: space[5],
    "@media (max-width: 640px)": {
      paddingInline: space[4],
    },
  },
  saveStatus: {
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

function filesFromDraft(input: ComposeInput | null | undefined) {
  return (input?.attachments ?? []).map((attachment) => {
    const binary = atob(attachment.data.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new File([bytes], attachment.filename, {
      type: attachment.mimeType,
    });
  });
}

function draftFingerprint(input: ComposeInput, files: File[]) {
  return JSON.stringify({
    from: input.from ?? "",
    to: input.to,
    cc: input.cc ?? "",
    bcc: input.bcc ?? "",
    subject: input.subject,
    text: input.text,
    html: input.html ?? "",
    inReplyTo: input.inReplyTo ?? "",
    threadId: input.threadId ?? "",
    files: files.map((file) => [file.name, file.type, file.size]),
  });
}

function hasDraftContent(input: ComposeInput, files: File[]) {
  return Boolean(
    input.draftId ||
      input.to ||
      input.cc ||
      input.bcc ||
      input.subject ||
      hasAuthoredComposeText(input.text) ||
      files.length,
  );
}

function parseList(value: string) {
  return value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(items: string[]) {
  return items.join(", ");
}

function takeAddresses(raw: string) {
  const parts = raw.split(/[,;]/);
  const committed: string[] = [];
  let rest = "";
  parts.forEach((part, index) => {
    const value = part.trim();
    const isLast = index === parts.length - 1;
    if (!value) return;
    if (!isLast || raw.trimEnd().match(/[,;]$/)) {
      committed.push(value);
      return;
    }
    rest = part.startsWith(" ") ? part.trimStart() : part;
    if (part !== rest && part.endsWith(" ") && value.includes("@")) {
      committed.push(value);
      rest = "";
    }
  });
  return { committed, rest };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function badgeColor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") {
    return "oklch(0.72 0.14 75)";
  }
  if (ext === "gif") return "oklch(0.62 0.18 300)";
  if (ext === "pdf") return "oklch(0.62 0.18 25)";
  return "var(--color-5)";
}

function fileExt(name: string) {
  return (name.split(".").pop() ?? "file").slice(0, 4).toUpperCase();
}

function AddressField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  extra,
  errorId,
  onChange,
  onEdit,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  extra?: React.ReactNode;
  errorId?: string;
  onChange: (value: string) => void;
  onEdit?: () => void;
}) {
  const addresses = parseList(value);
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const { committed, rest } = takeAddresses(raw.endsWith(",") ? raw : `${raw},`);
    const next = [...addresses];
    for (const item of committed) {
      if (!next.includes(item)) next.push(item);
    }
    onChange(joinList(next));
    setDraft(rest);
  };

  return (
    <div {...stylex.props(styles.row)}>
      <label htmlFor={id} {...stylex.props(styles.label)}>
        {label}
      </label>
      <div {...stylex.props(styles.chips)}>
        {addresses.map((address) => (
          <span key={address} {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipText)}>{address}</span>
            <button
              type="button"
              {...stylex.props(styles.chipRemove)}
              aria-label={`Remove ${address}`}
              onClick={() => onChange(joinList(addresses.filter((item) => item !== address)))}
            >
              <Icons.close size={10} />
            </button>
          </span>
        ))}
        <input
          id={id}
          data-border-focus=""
          {...stylex.props(styles.field, styles.placeholder)}
          name={id}
          type="text"
          inputMode="email"
          autoComplete={autoComplete}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          placeholder={addresses.length === 0 ? placeholder : undefined}
          value={draft}
          onChange={(event) => {
            onEdit?.();
            const next = event.target.value;
            if (/[,;]/.test(next)) {
              commit(next);
              return;
            }
            setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab") {
              if (draft.trim()) {
                event.preventDefault();
                commit(draft);
              }
              return;
            }
            if (event.key === "Backspace" && !draft && addresses.length) {
              onChange(joinList(addresses.slice(0, -1)));
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
        />
      </div>
      {extra}
    </div>
  );
}

export function StandaloneComposer({
  accountId,
  senderEmail,
  editableSender,
  supportsDrafts,
  open,
  sending,
  initial,
  recalled,
  onOpenChange,
  onSend,
}: {
  accountId: string;
  senderEmail: string;
  editableSender: boolean;
  supportsDrafts: boolean;
  open: boolean;
  sending: boolean;
  initial: ComposeInput;
  /** A queued message pulled back out of the undo window. */
  recalled?: ComposeInput | null;
  onOpenChange: (open: boolean) => void;
  onSend: (input: ComposeInput, files?: File[]) => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const initialFiles = filesFromDraft(initial);
  const initialDraft = {
    ...initial,
    from: editableSender ? initial.from ?? senderEmail : initial.from,
  };
  const [draft, setDraft] = useState<ComposeInput>(initialDraft);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [sendError, setSendError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [editorVersion, setEditorVersion] = useState(0);
  const draftIdRef = useRef(draft.draftId);
  const lastSavedRef = useRef(draftFingerprint(initialDraft, initialFiles));
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const editDraft = (patch: Partial<ComposeInput>) => {
    setSendError("");
    setSaveStatus("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  const editFiles = (next: (current: File[]) => File[]) => {
    setSendError("");
    setSaveStatus("");
    setFiles(next);
  };

  const { dragging, onDragOver, onDragEnter, onDragLeave, onDrop } = useFileDrop(
    (dropped) => editFiles((current) => [...current, ...dropped]),
  );

  const dirty = Boolean(
    recalled ||
      draft.draftId ||
      draftFingerprint(draft, files) !== draftFingerprint(initialDraft, initialFiles),
  );

  const reset = () => {
    setDraft(initialDraft);
    setFiles(initialFiles);
    setShowCc(false);
    setExpanded(false);
    setSendError("");
    setSaveStatus("");
    draftIdRef.current = undefined;
    lastSavedRef.current = draftFingerprint(initialDraft, initialFiles);
    setEditorVersion((current) => current + 1);
  };

  const saveNow = useCallback(
    (snapshot: ComposeInput, snapshotFiles: File[]) => {
      if (!supportsDrafts || !hasDraftContent(snapshot, snapshotFiles)) {
        return Promise.resolve();
      }
      const fingerprint = draftFingerprint(snapshot, snapshotFiles);
      if (fingerprint === lastSavedRef.current) return Promise.resolve();
      setSaveStatus("saving");
      const operation = saveChain.current.then(async () => {
        const id = await persistDraft(
          accountId,
          { ...snapshot, draftId: draftIdRef.current ?? snapshot.draftId },
          snapshotFiles,
        );
        draftIdRef.current = id;
        lastSavedRef.current = fingerprint;
        setDraft((current) =>
          current.draftId === id ? current : { ...current, draftId: id },
        );
        setSaveStatus("saved");
      });
      saveChain.current = operation.catch(() => undefined);
      operation.catch(() => setSaveStatus("error"));
      return operation;
    },
    [accountId, supportsDrafts],
  );

  useEffect(() => {
    if (!open || !supportsDrafts) return;
    const fingerprint = draftFingerprint(draft, files);
    if (fingerprint === lastSavedRef.current) return;
    const timer = window.setTimeout(() => {
      void saveNow(draft, files);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, files, open, saveNow, supportsDrafts]);

  const discard = async () => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    await discardDraft();
  };

  const discardDraft = async () => {
    if (supportsDrafts && draftIdRef.current) {
      try {
        await removeDraft(accountId, draftIdRef.current);
      } catch (error) {
        setSendError(
          error instanceof Error ? error.message : "Unable to discard this draft.",
        );
        return false;
      }
    }
    reset();
    onOpenChange(false);
    return true;
  };

  const submit = async () => {
    const field = document.getElementById(
      "compose-to",
    ) as HTMLInputElement | null;
    const pending = field?.value.trim();
    const to = pending ? [draft.to, pending].filter(Boolean).join(", ") : draft.to;
    const error = await onSend({ ...draft, to }, files);
    if (error) {
      setSendError(error);
      field?.focus();
      return;
    }
    reset();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) void saveNow(draft, files);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={stylex.props(styles.backdrop).className} />
        <Dialog.Popup
          initialFocus={subjectRef}
          {...stylex.props(styles.popup, expanded && styles.popupExpanded)}
        >
          <Dialog.Title className="sr-only">New email</Dialog.Title>
          <Dialog.Description className="sr-only">
            Write and send a new message.
          </Dialog.Description>
          <div {...stylex.props(styles.chrome)}>
            <div {...stylex.props(styles.recipients)}>
              {editableSender ? (
                <SenderField
                  id="compose-from"
                  value={draft.from ?? senderEmail}
                  onChange={(from) => editDraft({ from })}
                />
              ) : null}
              <AddressField
                id="compose-to"
                label="To"
                value={draft.to}
                placeholder="recipient@example.com"
                autoComplete="email"
                errorId={sendError ? "compose-send-error" : undefined}
                onChange={(to) => editDraft({ to })}
                onEdit={() => setSendError("")}
                extra={
                  <IconButton
                    type="button"
                    aria-label={showCc ? "Hide Cc and Bcc" : "Show Cc and Bcc"}
                    aria-expanded={showCc}
                    onClick={() => setShowCc((value) => !value)}
                  >
                    <span {...stylex.props(styles.chevron, showCc && styles.chevronOpen)}>
                      <Icons.chevronDown size={13} />
                    </span>
                  </IconButton>
                }
              />
              {showCc ? (
                <>
                  <AddressField
                    id="compose-cc"
                    label="Cc"
                    value={draft.cc ?? ""}
                    placeholder="cc@example.com, cc2@example.com"
                    autoComplete="email"
                    onChange={(cc) => editDraft({ cc })}
                  />
                  <AddressField
                    id="compose-bcc"
                    label="Bcc"
                    value={draft.bcc ?? ""}
                    placeholder="bcc@example.com, bcc2@example.com"
                    autoComplete="email"
                    onChange={(bcc) => editDraft({ bcc })}
                  />
                </>
              ) : null}
            </div>
            <div {...stylex.props(styles.windowActions)}>
              <IconButton
                type="button"
                aria-label={expanded ? "Exit full screen" : "Full screen"}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? <Icons.unexpand size={14} /> : <Icons.expand size={14} />}
              </IconButton>
              <Dialog.Close
                render={
                  <IconButton type="button" aria-label="Close composer">
                    <Icons.close size={12} />
                  </IconButton>
                }
              />
            </div>
          </div>
          <RichTextComposer
            key={editorVersion}
            initialText={initial.text}
            initialHtml={initial.html}
            onChange={(value) => editDraft(value)}
          >
            <div
              {...stylex.props(styles.body)}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {dragging ? <div {...stylex.props(styles.dropOverlay)}>Drop files here</div> : null}
              <label {...stylex.props(styles.subjectWrap)}>
                <span className="sr-only">Subject</span>
                <input
                  ref={subjectRef}
                  {...stylex.props(styles.subject, styles.placeholder)}
                  name="subject"
                  placeholder="Subject"
                  value={draft.subject}
                  onChange={(event) => editDraft({ subject: event.target.value })}
                />
              </label>
              <div {...stylex.props(styles.messageWrap)}>
                <RichTextEditor
                  placeholder="Write your message…"
                  expanded
                  onSubmit={() => void submit()}
                />
              </div>
              {files.length ? (
                <div {...stylex.props(styles.attachments)}>
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} {...stylex.props(styles.file)}>
                      <span
                        {...stylex.props(styles.badge)}
                        style={{ backgroundColor: badgeColor(file.name) }}
                      >
                        {fileExt(file.name)}
                      </span>
                      <span {...stylex.props(styles.fileMeta)}>
                        <span {...stylex.props(styles.fileName)} title={file.name}>
                          {file.name}
                        </span>
                        <span {...stylex.props(styles.fileSize)}>
                          {formatSize(file.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        {...stylex.props(styles.chipRemove)}
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          editFiles((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <Icons.close size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {sendError ? (
              <div id="compose-send-error" role="alert" {...stylex.props(styles.error)}>
                {sendError}
              </div>
            ) : null}
            <div {...stylex.props(styles.foot)}>
              <div {...stylex.props(styles.tools)}>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => {
                    const next = Array.from(event.target.files ?? []);
                    if (next.length) editFiles((current) => [...current, ...next]);
                    event.target.value = "";
                  }}
                />
                <IconButton
                  type="button"
                  aria-label="Attach files"
                  onClick={() => fileRef.current?.click()}
                >
                  <Icons.paperclip size={16} />
                </IconButton>
                <RichTextToolbar />
                {supportsDrafts ? (
                  <span
                    role="status"
                    aria-live="polite"
                    {...stylex.props(styles.saveStatus)}
                  >
                    {saveStatus === "saving"
                      ? "Saving…"
                      : saveStatus === "saved"
                        ? "Saved"
                        : saveStatus === "error"
                          ? "Not saved"
                          : ""}
                  </span>
                ) : null}
              </div>
              <div {...stylex.props(styles.actions)}>
                <Button type="button" variant="ghost" onClick={() => void discard()}>
                  Discard
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  disabled={sending}
                  onClick={() => void submit()}
                >
                  {sending ? "Sending" : "Send"}
                </Button>
              </div>
            </div>
          </RichTextComposer>
        </Dialog.Popup>
      </Dialog.Portal>
      <ConfirmDialog
        open={discardOpen}
        title="Discard draft?"
        description="This draft and its attachments will be permanently deleted."
        confirmLabel="Discard draft"
        onOpenChange={setDiscardOpen}
        onConfirm={discardDraft}
      />
    </Dialog.Root>
  );
}
