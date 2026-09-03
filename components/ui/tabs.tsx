import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";

/* Width of the fillet that carries the active tab into the pane below. */
export const WORKSPACE_TAB_CONNECTOR = 19;

const CONNECTOR = WORKSPACE_TAB_CONNECTOR;
const CONNECTOR_BEFORE =
  'path("M 10.6099 18.1552 C 8.38234 19 5.5882 19 0 19 H 20 V 0 H 19 C 19 5.58823 19 8.38234 18.1552 10.6099 C 16.8358 14.0889 14.0889 16.8358 10.6099 18.1552 Z")';
const CONNECTOR_AFTER =
  'path("M 9.39014 18.1552 C 11.6177 19 14.4118 19 20 19 H 0 V 0 H 1 C 1 5.58823 1 8.38234 1.844789 10.6099 C 3.16421 14.0889 5.91112 16.8358 9.39014 18.1552 Z")';

const styles = stylex.create({
  list: {
    display: "flex",
    width: "max-content",
    /* Tabs hang from the bottom of the strip so the active one meets the pane. */
    alignItems: "flex-end",
    gap: space[2],
    minHeight: 36,
    position: "relative",
  },
  tab: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    height: 32,
    /* Only the active tab reaches the pane. Everything else stops short so a
       hover never looks joined to it. */
    marginBlockEnd: 4,
    maxWidth: 220,
    flexShrink: 0,
    paddingInlineStart: 10,
    paddingInlineEnd: 12,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    borderRadius: radius.lg,
    cursor: "pointer",
    whiteSpace: "nowrap",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text, backgroundColor: colors.surfaceHover },
    },
  },
  /* The active tab stops being a control and becomes the top edge of the pane:
     pane fill, top corners only, and one pixel of overlap so the pane never
     draws a seam across the join. It grows by exactly the clearance the other
     tabs keep, and pads that growth back out, so every label stays on one line. */
  tabActive: {
    position: "sticky",
    insetInlineStart: 0,
    /* Keep the trailing connector inside the scroll rail before New tab. */
    insetInlineEnd: CONNECTOR,
    backgroundColor: colors.surface,
    color: colors.text,
    zIndex: 1,
    height: 37,
    marginBlockEnd: -1,
    paddingBlockEnd: 5,
    borderStartStartRadius: radius.lg,
    borderStartEndRadius: radius.lg,
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surface },
    },
    "::before": {
      content: "''",
      position: "absolute",
      insetBlockEnd: 0,
      /* Preserve the original 19px curve and tuck its extra straight pixel
         under the tab so rasterization cannot leave a seam at the join. */
      insetInlineEnd: "calc(100% - 1px)",
      width: 20,
      height: CONNECTOR,
      backgroundColor: colors.surface,
      clipPath: CONNECTOR_BEFORE,
      pointerEvents: "none",
    },
    "::after": {
      content: "''",
      position: "absolute",
      insetBlockEnd: 0,
      insetInlineStart: "calc(100% - 1px)",
      width: 20,
      height: CONNECTOR,
      backgroundColor: colors.surface,
      clipPath: CONNECTOR_AFTER,
      pointerEvents: "none",
    },
  },
  /* Above the mobile breakpoint the strip starts at the pane's left edge, so
     the first tab has no pane surface beside it to fillet into. It squares off
     against the edge instead, and the pane drops its matching corner. */
  tabFlushStart: {
    "@media (min-width: 641px)": {
      "::before": { display: "none" },
    },
  },
  tabAtStartEdge: {
    "::before": { display: "none" },
  },
  tabReorderable: {
    cursor: "grab",
    userSelect: "none",
    ":active": { cursor: "grabbing" },
  },
  tabDragging: {
    opacity: 0.55,
    cursor: "grabbing",
  },
});

export function workspaceTabProps(
  active: boolean,
  flushStart = false,
  atStartEdge = false,
  reorderable = false,
  dragging = false,
) {
  return stylex.props(
    styles.tab,
    active && styles.tabActive,
    active && flushStart && styles.tabFlushStart,
    active && atStartEdge && styles.tabAtStartEdge,
    reorderable && styles.tabReorderable,
    dragging && styles.tabDragging,
  );
}

export function workspaceListProps() {
  return stylex.props(styles.list);
}
