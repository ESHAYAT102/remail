"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { bytes } from "@/lib/format";
import type { Attachment } from "@/lib/mail/types";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
const PDF_TYPE = "application/pdf";

const styles = stylex.create({
  backdrop: {
    backgroundColor: "oklch(0 0 0 / 0.6)",
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    overscrollBehavior: "contain",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "[data-starting-style]": { opacity: 0 },
    "[data-ending-style]": { opacity: 0 },
  },
  popup: {
    position: "fixed",
    inset: 0,
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: space[4],
    outline: "none",
  },
  toolbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${space[3]} ${space[4]}`,
    zIndex: 1002,
    backgroundColor: "oklch(0 0 0 / 0.5)",
    color: "#fff",
  },
  fileName: {
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    color: "#fff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "50%",
  },
  fileSize: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: "rgba(255,255,255,0.7)",
    marginLeft: space[2],
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  },
  toolbarBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[1],
    padding: `${space[1]} ${space[2]}`,
    borderRadius: radius.lg,
    border: "none",
    backgroundColor: "transparent",
    color: "#fff",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    cursor: "pointer",
    textDecoration: "none",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: "rgba(255,255,255,0.15)" },
    },
  },
  image: {
    maxWidth: "90vw",
    maxHeight: "calc(100vh - 80px)",
    objectFit: "contain",
    borderRadius: radius.lg,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const image = isImage(attachment.mimeType);
  const pdf = isPdf(attachment.mimeType);
  const href = downloadHref(attachment, accountId);

  return (
    <div
      ref={backdropRef}
      {...stylex.props(styles.backdrop)}
      onClick={handleBackdropClick}
    >
      <div {...stylex.props(styles.popup)}>
        <div {...stylex.props(styles.toolbar)}>
          <div style={{ display: "flex", alignItems: "baseline", minWidth: 0 }}>
            <span {...stylex.props(styles.fileName)}>{attachment.filename}</span>
            <span {...stylex.props(styles.fileSize)}>{bytes(attachment.size)}</span>
          </div>
          <div {...stylex.props(styles.actions)}>
            <a
              href={href}
              download={attachment.filename}
              {...stylex.props(styles.toolbarBtn)}
            >
              <Icons.download size={14} />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              {...stylex.props(styles.toolbarBtn)}
            >
              <Icons.close size={14} />
            </button>
          </div>
        </div>
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
            style={{
              width: "90vw",
              height: "calc(100vh - 80px)",
              border: "none",
              borderRadius: radius.lg,
            }}
          />
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
}
