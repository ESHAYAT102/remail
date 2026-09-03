"use client";

import { Menu as Base } from "@base-ui/react/menu";
import { ContextMenu as ContextBase } from "@base-ui/react/context-menu";
import * as stylex from "@stylexjs/stylex";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  positioner: {
    zIndex: 30,
    maxWidth: "calc(100vw - 24px)",
  },
  popup: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "min(480px, var(--available-height))",
    overflowY: "auto",
    overscrollBehavior: "contain",
    backgroundColor: colors.surfaceGlass,
    backgroundImage: colors.raised,
    backdropFilter: "blur(16px)",
    borderRadius: radius["2xl"],
    boxShadow: elevation.overlay,
    padding: space[2],
    minWidth: 220,
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
  item: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minHeight: 36,
    paddingBlock: space[1],
    paddingInline: 10,
    width: "100%",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    color: colors.text,
    cursor: "pointer",
    outline: "none",
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    fontFamily: "inherit",
    textAlign: "start",
    textDecoration: "none",
    touchAction: "manipulation",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover) and (prefers-reduced-motion: no-preference)": {
      "[data-highlighted]": {
        "--redakt-folder-front-scale": 0.88,
        "--redakt-folder-badge-shift": "1px",
      },
    },
    "[data-highlighted]": {
      backgroundColor: colors.surfaceHover,
    },
    "[data-disabled]": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
    "@media (max-width: 640px)": { minHeight: 44 },
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
    marginBlock: space[1],
    marginInline: -8,
    borderWidth: 0,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    flexShrink: 0,
    color: colors.textMuted,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginInlineStart: "auto",
    color: colors.textFaint,
  },
  shortcut: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    paddingInline: space[1],
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceActive,
    color: colors.textFaint,
    fontSize: fonts.microSize,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  group: {
    display: "flex",
    flexDirection: "column",
  },
  groupLabel: {
    paddingBlock: space[1],
    paddingInline: 10,
    color: colors.textFaint,
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    letterSpacing: fonts.microTrack,
    fontWeight: 550,
  },
});

function mergeClassName(styled: ReturnType<typeof stylex.props>, className?: unknown) {
  const own = typeof className === "string" ? className : "";
  return [styled.className, own].filter(Boolean).join(" ");
}

function menuSlot(
  styled: ReturnType<typeof stylex.props>,
  {
    className,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>,
) {
  return (
    <span
      {...props}
      className={mergeClassName(styled, className)}
      style={{ ...styled.style, ...props.style }}
    />
  );
}

export const Menu = {
  Root: Base.Root,
  Trigger: Base.Trigger,
  Portal: Base.Portal,
  Positioner: function Positioner(
    props: React.ComponentProps<typeof Base.Positioner>,
  ) {
    const styled = stylex.props(styles.positioner);
    return (
      <Base.Positioner
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Popup: function Popup(props: React.ComponentProps<typeof Base.Popup>) {
    const styled = stylex.props(styles.popup);
    return (
      <Base.Popup
        {...props}
        className={mergeClassName(styled, props.className)}
        style={styled.style}
      />
    );
  },
  Group: function Group(props: React.ComponentProps<typeof Base.Group>) {
    const styled = stylex.props(styles.group);
    return (
      <Base.Group
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  GroupLabel: function GroupLabel(
    props: React.ComponentProps<typeof Base.GroupLabel>,
  ) {
    const styled = stylex.props(styles.groupLabel);
    return (
      <Base.GroupLabel
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Item: function Item(props: React.ComponentProps<typeof Base.Item>) {
    const styled = stylex.props(styles.item);
    return (
      <Base.Item
        {...props}
        className={mergeClassName(styled, props.className)}
        style={styled.style}
      />
    );
  },
  Separator: function Separator(
    props: React.ComponentProps<typeof Base.Separator>,
  ) {
    const styled = stylex.props(styles.separator);
    return (
      <Base.Separator
        {...props}
        className={mergeClassName(styled, props.className)}
        style={styled.style}
      />
    );
  },
  Icon: function Icon(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.icon), props);
  },
  Label: function Label(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.label), props);
  },
  Trailing: function Trailing(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.trailing), props);
  },
  Shortcut: function Shortcut(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.shortcut), props);
  },
};

export const ContextMenu = {
  Root: ContextBase.Root,
  Trigger: ContextBase.Trigger,
  Portal: ContextBase.Portal,
  Positioner: function Positioner(
    props: React.ComponentProps<typeof ContextBase.Positioner>,
  ) {
    const styled = stylex.props(styles.positioner);
    return (
      <ContextBase.Positioner
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Popup: function Popup(
    props: React.ComponentProps<typeof ContextBase.Popup>,
  ) {
    const styled = stylex.props(styles.popup);
    return (
      <ContextBase.Popup
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Item: function Item(props: React.ComponentProps<typeof ContextBase.Item>) {
    const styled = stylex.props(styles.item);
    return (
      <ContextBase.Item
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Separator: function Separator(
    props: React.ComponentProps<typeof ContextBase.Separator>,
  ) {
    const styled = stylex.props(styles.separator);
    return (
      <ContextBase.Separator
        {...props}
        className={mergeClassName(styled, props.className)}
        style={{ ...styled.style, ...props.style }}
      />
    );
  },
  Icon: function Icon(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.icon), props);
  },
  Label: function Label(props: React.HTMLAttributes<HTMLSpanElement>) {
    return menuSlot(stylex.props(styles.label), props);
  },
};
