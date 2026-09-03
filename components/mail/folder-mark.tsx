import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import { CollectionIcon } from "@/components/mail/collection-icon";
import {
  folderToneForSeed,
  type FolderTone,
} from "@/lib/mail/folder-appearance";
import {
  normalizeCollectionColor,
  type CollectionIconName,
} from "@/lib/mail/collection-appearance";
import { folderPalette } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
    display: "inline-block",
    width: 20,
    height: 17,
    flexShrink: 0,
    color: folderPalette.neutral,
    pointerEvents: "none",
  },
  compact: {
    width: 16,
    height: 14,
  },
  preview: {
    width: 32,
    height: 27,
  },
  neutral: { color: folderPalette.neutral },
  rose: { color: folderPalette.rose },
  amber: { color: folderPalette.amber },
  green: { color: folderPalette.green },
  blue: { color: folderPalette.blue },
  violet: { color: folderPalette.violet },
  back: {
    position: "absolute",
    insetBlock: 0,
    insetInline: 0,
    width: "100%",
    height: "100%",
    overflow: "visible",
    opacity: 0.72,
  },
  front: {
    position: "absolute",
    insetInline: 0,
    insetBlockEnd: 0,
    zIndex: 1,
    width: "100%",
    height: "80%",
    overflow: "visible",
    transform: "scaleY(var(--redakt-folder-front-scale, 1))",
    transformOrigin: "center bottom",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  gradientBackTop: {
    stopColor: folderPalette.backTop,
  },
  gradientBack: {
    stopColor: folderPalette.back,
  },
  gradientFrontTop: {
    stopColor: folderPalette.frontTop,
  },
  gradientFront: {
    stopColor: folderPalette.front,
  },
  badge: {
    position: "absolute",
    insetBlockStart: 6,
    insetInlineStart: 5,
    zIndex: 2,
    display: "inline-flex",
    width: 9,
    height: 9,
    alignItems: "center",
    justifyContent: "center",
    color: folderPalette.badgeInk,
    transform: "translateY(var(--redakt-folder-badge-shift, 0px))",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  badgeCompact: {
    insetBlockStart: 5,
    insetInlineStart: 4,
    width: 7,
    height: 7,
  },
  badgePreview: {
    insetBlockStart: 9,
    insetInlineStart: 9,
    width: 14,
    height: 14,
  },
});

const toneStyles: Record<FolderTone, (typeof styles)["neutral"]> = {
  neutral: styles.neutral,
  rose: styles.rose,
  amber: styles.amber,
  green: styles.green,
  blue: styles.blue,
  violet: styles.violet,
};

/**
 * A folder silhouette built from two SVG layers: its tabbed back and its
 * overlapping front. The optional badge floats above the front layer.
 */
export function FolderMark({
  seed = "",
  tone,
  color,
  icon,
  badge,
  size = "regular",
}: {
  seed?: string;
  tone?: FolderTone;
  color?: string;
  icon?: CollectionIconName;
  badge?: React.ReactNode;
  size?: "compact" | "preview" | "regular";
}) {
  const compact = size === "compact";
  const preview = size === "preview";
  const resolvedTone = tone ?? folderToneForSeed(seed);
  const resolvedColor = normalizeCollectionColor(color);
  const gradientId = useId().replaceAll(":", "");
  const backGradientId = `${gradientId}-folder-back`;
  const frontGradientId = `${gradientId}-folder-front`;
  const styledRoot = stylex.props(
    styles.root,
    toneStyles[resolvedTone],
    compact && styles.compact,
    preview && styles.preview,
  );
  const badgeContent =
    badge ??
    (icon ? (
      <CollectionIcon
        name={icon}
        size={preview ? 10 : compact ? 6 : 7}
        strokeWidth={preview ? 1.25 : 1.1}
      />
    ) : null);

  return (
    <span
      aria-hidden="true"
      className={styledRoot.className}
      style={{
        ...styledRoot.style,
        ...(resolvedColor ? { color: resolvedColor } : {}),
      }}
    >
      <svg
        viewBox="0 0 160 120"
        fill="none"
        preserveAspectRatio="none"
        {...stylex.props(styles.back)}
      >
        <defs>
          <linearGradient
            id={backGradientId}
            x1="80"
            y1="0"
            x2="80"
            y2="118"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" {...stylex.props(styles.gradientBackTop)} />
            <stop offset="1" {...stylex.props(styles.gradientBack)} />
          </linearGradient>
        </defs>
        <path
          d="M6 12C6 6.477 10.477 2 16 2H56C58.5 2 60.5 3.5 62 6L66 12C67.5 14.5 69.5 16 72 16H144C149.523 16 154 20.477 154 26V108C154 113.523 149.523 118 144 118H16C10.477 118 6 113.523 6 108V12Z"
          fill={`url(#${backGradientId})`}
        />
      </svg>
      <svg
        viewBox="0 0 160 80"
        fill="none"
        preserveAspectRatio="none"
        {...stylex.props(styles.front)}
      >
        <defs>
          <linearGradient
            id={frontGradientId}
            x1="80"
            y1="0"
            x2="80"
            y2="80"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" {...stylex.props(styles.gradientFrontTop)} />
            <stop offset="1" {...stylex.props(styles.gradientFront)} />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="2"
          width="152"
          height="76"
          rx="14"
          fill={`url(#${frontGradientId})`}
        />
      </svg>
      {badgeContent ? (
        <span
          {...stylex.props(
            styles.badge,
            compact && styles.badgeCompact,
            preview && styles.badgePreview,
          )}
        >
          {badgeContent}
        </span>
      ) : null}
    </span>
  );
}
