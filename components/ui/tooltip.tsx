"use client";

import { Tooltip as Base } from "@base-ui/react/tooltip";
import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  popup: {
    backgroundColor: colors.text,
    color: colors.surface,
    borderRadius: radius.sm,
    paddingBlock: 4,
    paddingInline: space[2],
    fontSize: fonts.microSize,
    letterSpacing: fonts.microTrack,
    lineHeight: fonts.microLine,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "[data-starting-style]": {
      opacity: 0,
      transform: "translateY(4px)",
    },
    "[data-ending-style]": {
      opacity: 0,
      transform: "translateY(2px)",
    },
  },
});

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  const styled = stylex.props(styles.popup);
  return (
    <Base.Root>
      <Base.Trigger render={children} />
      <Base.Portal>
        <Base.Positioner sideOffset={6}>
          <Base.Popup className={styled.className} style={styled.style}>
            {label}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
