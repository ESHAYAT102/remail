"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { bytes } from "@/lib/format";
import type { Attachment } from "@/lib/mail/types";
import { SpreadsheetPreview, isSpreadsheet } from "./spreadsheet-preview";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
const PDF_TYPE = "application/pdf";

/* Portalled to document.body at z 20000 so it sits above the sidebar,
   the tab rail, and every compose dialog. */
const styles = stylex.create({
  backdrop: {
    backgroundColor: "oklch(0 0 0 / 0.5)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    position: "fixed",
    inset: 0,
    zIndex: 20000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: space[4],
    overscrollBehavior: "contain",
    opacity: 0,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity",
      transitionDuration: "200ms",
      transitionTimingFunction: "ease-out",
    },
  },
  backdropShown: {
    opacity: 1,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
    maxHeight: "100%",
    transform: "scale(0.92)",
    opacity: 0,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, opacity",
      transitionDuration: "200ms",
      transitionTimingFunction: "ease-out",
    },
  },
  contentShown: {
    transform: "scale(1)",
    opacity: 1,
  },
  toolbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: `${space[3]} ${space[4]}`,
    backgroundColor: "transparent",
    color: "#fff",
  },
  image: {
    maxWidth: "90vw",
    maxHeight: "calc(100vh - 80px)",
    objectFit: "contain",
    borderRadius: radius.lg,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  frame: {
    width: "90vw",
    height: "calc(100vh - 80px)",
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  nonImage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space[4],
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    borderRadius: radius.xl,
    boxShadow: elevation.overlay,
    padding: space[7],
    maxWidth: 400,
    width: "100%",
  },
  fileIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceActive,
    color: colors.textMuted,
  },
  nonImageName: {
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    color: colors.text,
    textAlign: "center",
    wordBreak: "break-word",
  },
  nonImageSize: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
  },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    padding: `${space[2]} ${space[4]}`,
    borderRadius: radius.lg,
    border: "none",
    backgroundColor: colors.text,
    color: colors.surface,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { opacity: 0.85 },
    },
  },
});

function downloadHref(attachment: Attachment, accountId: string) {
  return `/api/mail/attachments/${encodeURIComponent(attachment.id)}?account=${encodeURIComponent(accountId)}&filename=${encodeURIComponent(attachment.filename)}`;
}

function isImage(mimeType: string) {
  return IMAGE_TYPES.has(mimeType);
}

function isPdf(mimeType: string) {
  return mimeType === PDF_TYPE;
}

const EXIT_MS = 200;

export function AttachmentPreview({
  attachment,
  accountId,
  open,
  onClose,
}: {
  attachment: Attachment;
  accountId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [portalled, setPortalled] = useState(false);
  if (!portalled && typeof document !== "undefined") {
    setPortalled(true);
  }
  /* Stay mounted briefly after `open` flips false so the scale-down
     exit animation can play before unmount. State adjusts during render
     (the documented derived-state pattern) so no effect sets state
     synchronously. */
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setShown(false);
    if (open) setRender(true);
  }

  useEffect(() => {
    if (!open || !render) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(frame);
  }, [open, render]);

  useEffect(() => {
    if (open || !render) return;
    const timer = setTimeout(() => setRender(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, render]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!portalled || !render) return null;

  const image = isImage(attachment.mimeType);
  const pdf = isPdf(attachment.mimeType);
  const spreadsheet = isSpreadsheet(attachment.mimeType, attachment.filename);
  const href = downloadHref(attachment, accountId);

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${attachment.filename}`}
      {...stylex.props(styles.backdrop, shown && styles.backdropShown)}
      onClick={onClose}
    >
      <div {...stylex.props(styles.toolbar)} onClick={(e) => e.stopPropagation()}>
        <a
          href={href}
          download={attachment.filename}
          {...stylex.props(styles.downloadBtn)}
        >
          <Icons.download size={14} />
          Download
        </a>
      </div>
      <div
        {...stylex.props(styles.content, shown && styles.contentShown)}
        onClick={(e) => e.stopPropagation()}
      >
        {image ? (
          <img
            src={href}
            alt={attachment.filename}
            {...stylex.props(styles.image)}
          />
        ) : pdf ? (
          <iframe
            src={href}
            title={attachment.filename}
            {...stylex.props(styles.frame)}
          />
        ) : spreadsheet ? (
          <SpreadsheetPreview attachment={attachment} accountId={accountId} />
        ) : (
          <div {...stylex.props(styles.nonImage)}>
            <div {...stylex.props(styles.fileIcon)}>
              <Icons.attach size={32} />
            </div>
            <div {...stylex.props(styles.nonImageName)}>{attachment.filename}</div>
            <div {...stylex.props(styles.nonImageSize)}>{bytes(attachment.size)}</div>
            <a
              href={href}
              download={attachment.filename}
              {...stylex.props(styles.downloadBtn)}
            >
              <Icons.download size={14} />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
