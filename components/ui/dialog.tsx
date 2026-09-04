"use client";

import { Dialog as Base } from "@base-ui/react/dialog";
import * as stylex from "@stylexjs/stylex";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  backdrop: {
    backgroundColor: "oklch(0 0 0 / 0.4)",
    position: "fixed",
    inset: 0,
    zIndex: 9999,
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
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    borderRadius: radius.xl,
    boxShadow: elevation.overlay,
    padding: space[5],
    width: "min(440px, calc(100vw - 48px))",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    outline: "none",
    zIndex: 10000,
    overscrollBehavior: "contain",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "[data-starting-style]": {
      opacity: 0,
      transform: "translate(-50%, calc(-50% + 8px))",
    },
    "[data-ending-style]": {
      opacity: 0,
      transform: "translate(-50%, calc(-50% + 6px))",
    },
  },
  title: {
    fontSize: fonts.titleSize,
    lineHeight: fonts.titleLine,
    fontWeight: 550,
    color: colors.text,
    marginBottom: space[2],
    textWrap: "balance",
  },
  desc: {
    fontSize: fonts.uiSize,
    lineHeight: 1.55,
    color: colors.textMuted,
    marginBottom: space[4],
    textWrap: "pretty",
  },
});

function merge(
  styled: ReturnType<typeof stylex.props>,
  props: { className?: unknown; style?: unknown },
) {
  const own = typeof props.className === "string" ? props.className : "";
  const style = typeof props.style === "object" ? (props.style as React.CSSProperties) : null;
  return {
    className: [styled.className, own].filter(Boolean).join(" "),
    style: { ...styled.style, ...style },
  };
}

export const Dialog = {
  Root: Base.Root,
  Trigger: Base.Trigger,
  Portal: Base.Portal,
  Backdrop: function Backdrop(props: React.ComponentProps<typeof Base.Backdrop>) {
    return <Base.Backdrop {...props} {...merge(stylex.props(styles.backdrop), props)} />;
  },
  Popup: function Popup(props: React.ComponentProps<typeof Base.Popup>) {
    return <Base.Popup {...props} {...merge(stylex.props(styles.popup), props)} />;
  },
  Title: function Title(props: React.ComponentProps<typeof Base.Title>) {
    return <Base.Title {...props} {...merge(stylex.props(styles.title), props)} />;
  },
  Description: function Description(props: React.ComponentProps<typeof Base.Description>) {
    return <Base.Description {...props} {...merge(stylex.props(styles.desc), props)} />;
  },
  Close: Base.Close,
};
