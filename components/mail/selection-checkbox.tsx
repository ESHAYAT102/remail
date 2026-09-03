"use client";

import { useEffect, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import { colors, radius } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
    display: "inline-flex",
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  input: {
    appearance: "none",
    width: 16,
    height: 16,
    margin: 0,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceActive,
    cursor: "pointer",
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.45,
    },
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
  },
  inputSelected: {
    backgroundColor: colors.accent,
  },
  mark: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.accentOnSolid,
    opacity: 0,
    pointerEvents: "none",
  },
  markVisible: {
    opacity: 1,
  },
  mixedMark: {
    width: 8,
    height: 2,
    borderRadius: radius.full,
    backgroundColor: "currentColor",
  },
});

export function SelectionCheckbox({
  checked,
  indeterminate = false,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "checked" | "readOnly" | "type"
> & {
  checked: boolean;
  indeterminate?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span {...stylex.props(styles.root)}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        readOnly
        {...stylex.props(
          styles.input,
          (checked || indeterminate) && styles.inputSelected,
        )}
      />
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.mark,
          (checked || indeterminate) && styles.markVisible,
        )}
      >
        {indeterminate ? (
          <span {...stylex.props(styles.mixedMark)} />
        ) : (
          <Icons.tick size={11} strokeWidth={2} />
        )}
      </span>
    </span>
  );
}
