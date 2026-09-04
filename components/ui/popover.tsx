"use client";

import { Popover as Base } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";
import { colors, elevation, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  positioner: {
    zIndex: 10001,
    maxWidth: "calc(100vw - 24px)",
  },
  popup: {
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "min(480px, var(--available-height))",
    overflowY: "auto",
    overscrollBehavior: "contain",
    backgroundColor: colors.surfaceGlass,
    backgroundImage: colors.raised,
    backdropFilter: "blur(16px)",
    borderRadius: radius["2xl"],
    boxShadow: elevation.overlay,
    padding: space[4],
    width: 320,
    outline: "none",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "[data-starting-style]": {
      opacity: 0,
      transform: "translateY(8px)",
    },
    "[data-ending-style]": {
      opacity: 0,
      transform: "translateY(4px)",
    },
  },
});

export const Popover = {
  Root: Base.Root,
  Trigger: Base.Trigger,
  Title: Base.Title,
  Portal: Base.Portal,
  Positioner: function Positioner(
    props: React.ComponentProps<typeof Base.Positioner>,
  ) {
    const styled = stylex.props(styles.positioner);
    return (
      <Base.Positioner
        {...props}
        className={[styled.className, props.className].filter(Boolean).join(" ")}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Popup: function Popup(props: React.ComponentProps<typeof Base.Popup>) {
    const styled = stylex.props(styles.popup);
    return (
      <Base.Popup
        {...props}
        className={[styled.className, props.className].filter(Boolean).join(" ")}
        style={styled.style}
      />
    );
  },
};
