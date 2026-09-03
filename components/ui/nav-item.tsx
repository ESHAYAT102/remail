"use client";

import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { colors, elevation, fonts, radius } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 36,
    paddingInline: 10,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    cursor: "pointer",
    textAlign: "start",
    textDecoration: "none",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover) and (prefers-reduced-motion: no-preference)": {
      ":hover": {
        "--redakt-folder-front-scale":
          "var(--redakt-folder-drop-front-scale, 0.88)",
        "--redakt-folder-badge-shift":
          "var(--redakt-folder-drop-badge-shift, 1px)",
      },
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
  },
  active: {
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceActive },
    },
  },
  dropAvailable: {
    backgroundColor: colors.surfaceHover,
    color: colors.text,
    cursor: "copy",
  },
  dropActive: {
    "--redakt-folder-drop-front-scale": 0.76,
    "--redakt-folder-drop-badge-shift": "2px",
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    "@media (hover: hover)": {
      ":hover": {
        backgroundColor: "var(--color-6)",
        color: colors.text,
      },
    },
  },
  icon: {
    width: 20,
    height: 18,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 450,
  },
  labelActive: {
    fontWeight: 500,
  },
  meta: {
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontVariantNumeric: "tabular-nums",
    fontWeight: 450,
  },
});

export function NavItem({
  label,
  meta,
  active = false,
  icon,
  href,
  onClick,
  dropAvailable = false,
  dropActive = false,
}: {
  label: string;
  meta?: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  dropAvailable?: boolean;
  dropActive?: boolean;
}) {
  const title = typeof meta === "number" || typeof meta === "string" ? `${label} (${meta})` : label;
  const hasMeta = meta !== undefined && meta !== null;
  const content = (
    <>
      <span {...stylex.props(styles.icon)}>{icon}</span>
      <span {...stylex.props(styles.label, active && styles.labelActive)}>{label}</span>
      {hasMeta ? (
        <span {...stylex.props(styles.meta)}>{meta}</span>
      ) : null}
    </>
  );
  const root = stylex.props(
    styles.root,
    active && styles.active,
    dropAvailable && styles.dropAvailable,
    dropActive && styles.dropActive,
  );

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        aria-current={active ? "page" : undefined}
        className={root.className}
        style={root.style}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={root.className}
      style={root.style}
    >
      {content}
    </button>
  );
}
