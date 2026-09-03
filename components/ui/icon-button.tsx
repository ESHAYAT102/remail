"use client";

import { forwardRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { colors, radius } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    flexShrink: 0,
    ":disabled": { opacity: 0.45, cursor: "not-allowed" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover:not(:disabled)": {
        backgroundColor: colors.surfaceHover,
        color: colors.text,
      },
    },
  },
  press: {
    ":active:not(:disabled)": { transform: "scale(0.96)" },
  },
});

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  static?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton({ className, style, static: isStatic, ...props }, ref) {
    const styled = stylex.props(styles.root, !isStatic && styles.press);
    return (
      <button
        {...props}
        ref={ref}
        className={[styled.className, className].filter(Boolean).join(" ")}
        style={{ ...styled.style, ...(style as React.CSSProperties) }}
      />
    );
  },
);
