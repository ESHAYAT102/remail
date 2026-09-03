"use client";

import { Select as Base } from "@base-ui/react/select";
import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

export type SelectOption = {
  value: string;
  label: string;
};

const styles = stylex.create({
  trigger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    width: "100%",
    height: 36,
    paddingInlineStart: space[3],
    paddingInlineEnd: 11,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    textAlign: "start",
    touchAction: "manipulation",
    ":disabled": { cursor: "not-allowed", opacity: 0.45 },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, box-shadow, opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
      ":active:not(:disabled)": { transform: "scale(0.96)" },
    },
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: "var(--color-6)" },
    },
    "@media (max-width: 640px)": {
      minHeight: 44,
      fontSize: "16px",
    },
  },
  value: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  triggerIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: colors.textFaint,
  },
  positioner: {
    zIndex: 30,
    maxWidth: "calc(100vw - 24px)",
  },
  popup: {
    width: "var(--anchor-width)",
    minWidth: 176,
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "min(360px, var(--available-height))",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: space[2],
    borderRadius: radius["2xl"],
    backgroundColor: colors.surfaceGlass,
    backgroundImage: colors.raised,
    backdropFilter: "blur(16px)",
    boxShadow: elevation.overlay,
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
  list: {
    display: "flex",
    flexDirection: "column",
    gap: space[1],
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    width: "100%",
    minHeight: 36,
    paddingBlock: space[1],
    paddingInline: 10,
    borderRadius: radius.lg,
    color: colors.text,
    cursor: "pointer",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    outline: "none",
    touchAction: "manipulation",
    "[data-highlighted]": {
      backgroundColor: colors.surfaceHover,
    },
    "[data-selected]": {
      backgroundColor: colors.surfaceActive,
      backgroundImage: colors.raised,
      boxShadow: elevation.lift,
      fontWeight: 500,
    },
    "[data-disabled]": {
      cursor: "not-allowed",
      opacity: 0.45,
    },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (max-width: 640px)": { minHeight: 44 },
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  indicator: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginInlineStart: "auto",
    color: colors.accentText,
  },
});

export function SelectControl({
  id,
  value,
  options,
  disabled,
  describedBy,
  onValueChange,
}: {
  id: string;
  value: string;
  options: readonly SelectOption[];
  disabled?: boolean;
  describedBy?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Base.Root<string>
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
    >
      <Base.Trigger
        id={id}
        aria-describedby={describedBy}
        {...stylex.props(styles.trigger)}
      >
        <Base.Value {...stylex.props(styles.value)} />
        <Base.Icon {...stylex.props(styles.triggerIcon)}>
          <Icons.chevronDown size={14} />
        </Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner
          sideOffset={4}
          align="end"
          alignItemWithTrigger={false}
          {...stylex.props(styles.positioner)}
        >
          <Base.Popup {...stylex.props(styles.popup)}>
            <Base.List {...stylex.props(styles.list)}>
              {options.map((option) => (
                <Base.Item key={option.value} value={option.value} {...stylex.props(styles.item)}>
                  <Base.ItemText {...stylex.props(styles.itemText)}>
                    {option.label}
                  </Base.ItemText>
                  <Base.ItemIndicator {...stylex.props(styles.indicator)}>
                    <Icons.tick size={14} strokeWidth={2} />
                  </Base.ItemIndicator>
                </Base.Item>
              ))}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
