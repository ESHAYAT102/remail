"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import {
  RichTextComposer,
  RichTextEditor,
  RichTextToolbar,
} from "@/components/mail/rich-text-editor";
import { addRedaktFooter } from "@/lib/mail/composer-footer";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { useFileDrop } from "./use-file-drop";
import type { ComposeInput, Message } from "@/lib/mail/types";

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
    width: "100%",
    padding: space[3],
    borderRadius: radius["2xl"],
    borderWidth: 0,
    boxShadow: elevation.control,
    backgroundColor: colors.surface,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  cardEnter: {
    opacity: 0,
    transform: "translateY(8px)",
  },
  cardIn: {
    opacity: 1,
    transform: "translateY(0)",
  },
  dropOverlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    inset: 0,
    borderRadius: radius["2xl"],
    backgroundColor: "oklch(0 0 0 / 0.08)",
    border: `2px dashed ${colors.accent}`,
    pointerEvents: "none",
    zIndex: 10,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    color: colors.accent,
  },
  heading: {
    paddingInline: space[1],
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    color: colors.textMuted,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minHeight: 28,
  },
  label: {
    flexShrink: 0,
    minWidth: 28,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    fontWeight: 500,
  },
  chips: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
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
    paddingBlock: space[1],
    outline: "none",
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
  message: {
    width: "100%",
    minHeight: 72,
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
    paddingBlockStart: space[1],
    flexWrap: "wrap",
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
  },
});

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

function formatSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

function uniqueEmails(emails: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    next.push(email);
  }
  return next;
}

export function draftFromMessage(
  mode: "reply" | "replyAll" | "forward",
  message: Message,
  userEmail: string,
  includeRedaktFooter = true,
): ComposeInput {
  const subject = message.subject;
  const self = userEmail.toLowerCase();
  if (mode === "forward") {
    const from = message.from.name
      ? `${message.from.name} <${message.from.email}>`
      : message.from.email;
    const footer = addRedaktFooter("", includeRedaktFooter);
    const forwarded = `---------- Forwarded message ----------\nFrom: ${from}\nDate: ${message.date}\nSubject: ${subject}\n\n${message.text ?? ""}`;
    return {
      to: "",
      cc: "",
      bcc: "",
      subject: subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`,
      text: `${footer}\n\n${forwarded}`,
      inReplyTo: message.id,
      threadId: message.threadId,
    };
  }
  const to =
    mode === "replyAll"
      ? uniqueEmails([
          message.from.email,
          ...message.to.map((address) => address.email),
          ...(message.cc ?? []).map((address) => address.email),
        ]).filter((email) => email.toLowerCase() !== self)
      : [message.from.email];
  return {
    to: joinList(to),
    cc: "",
    bcc: "",
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    text: addRedaktFooter("", includeRedaktFooter),
    inReplyTo: message.id,
    threadId: message.threadId,
  };
}

function AddressField({
  id,
  label,
  value,
  placeholder,
  extra,
  errorId,
  onChange,
  onEdit,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
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
            <span {...stylex.props(styles.chipText)} title={address}>
              {address}
            </span>
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
          {...stylex.props(styles.field, styles.placeholder)}
          name={id}
          type="text"
          inputMode="email"
          autoComplete="email"
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

export function CompactComposer({
  mode,
  heading,
  initial,
  sending,
  animateEntrance = true,
  onSend,
  onClose,
}: {
  mode: "reply" | "replyAll" | "forward";
  heading: string;
  initial: ComposeInput;
  sending: boolean;
  /** Animate only when the composer is entering from its hidden state. */
  animateEntrance?: boolean;
  onSend: (input: ComposeInput, files?: File[]) => Promise<string | null>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCc, setShowCc] = useState(false);
  const [draft, setDraft] = useState<ComposeInput>(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [entered, setEntered] = useState(!animateEntrance);
  const [sendError, setSendError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const editDraft = (patch: Partial<ComposeInput>) => {
    setSendError("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  const editFiles = (next: (current: File[]) => File[]) => {
    setSendError("");
    setFiles(next);
  };

  const { dragging, onDragOver, onDragEnter, onDragLeave, onDrop } = useFileDrop(
    (dropped) => editFiles((current) => [...current, ...dropped]),
  );

  useEffect(() => {
    if (!animateEntrance) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [animateEntrance]);

  const dirty = Boolean(
    draft.to !== initial.to ||
      draft.cc !== initial.cc ||
      draft.bcc !== initial.bcc ||
      draft.text !== initial.text ||
      draft.html !== initial.html ||
      files.length,
  );

  const discard = () => {
    if (dirty) setDiscardOpen(true);
    else onClose();
  };

  const submit = async () => {
    const pending = (
      document.getElementById("reply-to") as HTMLInputElement | null
    )?.value.trim();
    const to = pending ? [draft.to, pending].filter(Boolean).join(", ") : draft.to;
    const error = await onSend({ ...draft, to }, files);
    if (error) {
      setSendError(error);
      const field = document.getElementById("reply-to");
      if (field) field.focus();
      return;
    }
    onClose();
  };

  return (
    <div
      {...stylex.props(styles.card, entered ? styles.cardIn : styles.cardEnter)}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ position: "relative" }}
    >
      {dragging ? <div {...stylex.props(styles.dropOverlay)}>Drop files here</div> : null}
      <ConfirmDialog
        open={discardOpen}
        title="Discard draft?"
        description="This draft and its attachments will be permanently deleted."
        confirmLabel="Discard draft"
        onOpenChange={setDiscardOpen}
        onConfirm={onClose}
      />
      <div {...stylex.props(styles.heading)}>{heading}</div>
      <AddressField
        id="reply-to"
        label="To"
        value={draft.to}
        placeholder="recipient@example.com"
        errorId={sendError ? "reply-send-error" : undefined}
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
            id="reply-cc"
            label="Cc"
            value={draft.cc ?? ""}
            placeholder="cc@example.com"
            onChange={(cc) => editDraft({ cc })}
          />
          <AddressField
            id="reply-bcc"
            label="Bcc"
            value={draft.bcc ?? ""}
            placeholder="bcc@example.com"
            onChange={(bcc) => editDraft({ bcc })}
          />
        </>
      ) : null}
      <RichTextComposer
        initialText={initial.text}
        initialHtml={initial.html}
        onChange={(value) => editDraft(value)}
      >
        <RichTextEditor
          placeholder={mode === "forward" ? "Add a message…" : "Write a reply…"}
          autoFocus
          autoFocusSelection="rootStart"
          onEscape={discard}
          onSubmit={() => void submit()}
        />
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
                  <span {...stylex.props(styles.fileSize)}>{formatSize(file.size)}</span>
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
        {sendError ? (
          <div id="reply-send-error" role="alert" {...stylex.props(styles.error)}>
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
          </div>
          <div {...stylex.props(styles.actions)}>
            <Button type="button" variant="ghost" onClick={discard}>
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
    </div>
  );
}
