"use client";

import * as stylex from "@stylexjs/stylex";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    borderWidth: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    ":disabled": { opacity: 0.45, cursor: "not-allowed" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color, opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  press: {
    ":active:not(:disabled)": { transform: "scale(0.96)" },
  },
  solid: {
    backgroundColor: colors.text,
    color: colors.surface,
    borderRadius: radius.lg,
    height: 32,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { opacity: 0.88 },
    },
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.textMuted,
    borderRadius: radius.lg,
    height: 32,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
  },
  accent: {
    backgroundColor: colors.accent,
    color: colors.surface,
    borderRadius: radius.lg,
    height: 32,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { opacity: 0.9 },
    },
  },
  pill: {
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    borderRadius: radius.lg,
    height: 36,
    width: "100%",
    justifyContent: "flex-start",
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    fontWeight: 500,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: "var(--color-6)" },
    },
  },
  pillAccent: {
    backgroundColor: colors.accent,
    backgroundImage: colors.raisedAccent,
    boxShadow: elevation.liftAccent,
    color: colors.accentOnSolid,
    borderRadius: radius.lg,
    height: 36,
    width: "100%",
    justifyContent: "flex-start",
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    fontWeight: 500,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": {
        backgroundColor: "color-mix(in oklch, var(--accent) 86%, var(--color-1))",
      },
    },
  },
  soft: {
    backgroundColor: "var(--color-6)",
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    borderRadius: radius.lg,
    height: 32,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: "var(--color-5)" },
    },
  },
  danger: {
    backgroundColor: colors.dangerSolid,
    color: colors.dangerOnSolid,
    borderRadius: radius.lg,
    height: 32,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: colors.dangerSolidHover },
    },
  },
});

type Variant = "solid" | "ghost" | "accent" | "pill" | "pillAccent" | "soft" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  static?: boolean;
};

export function Button({
  variant = "solid",
  static: isStatic,
  className,
  style,
  ...props
}: Props) {
  const styled = stylex.props(
    styles.root,
    variant === "solid" && styles.solid,
    variant === "ghost" && styles.ghost,
    variant === "accent" && styles.accent,
    variant === "pill" && styles.pill,
    variant === "pillAccent" && styles.pillAccent,
    variant === "soft" && styles.soft,
    variant === "danger" && styles.danger,
    !isStatic && styles.press,
  );
  return (
    <button
      {...props}
      className={[styled.className, className].filter(Boolean).join(" ")}
      style={{ ...styled.style, ...(style as React.CSSProperties) }}
    />
  );
}
