"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { colors, fonts, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minHeight: 44,
    paddingInline: space[4],
    paddingBlock: space[2],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: fonts.titleSize,
    lineHeight: fonts.titleLine,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: colors.text,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 0,
    maxWidth: "28%",
    "@media (max-width: 640px)": {
      maxWidth: "40%",
    },
  },
  titleWithTools: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "none",
  },
  tools: {
    flex: 1,
    minWidth: 0,
  },
  toolsCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  meta: {
    marginInlineStart: "auto",
    fontSize: fonts.captionSize,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
    /* The count is the least useful thing in this row, and at narrow widths
       it squeezes the search field down to nothing. The list says it anyway. */
    "@media (max-width: 640px)": {
      display: "none",
    },
  },
});

export function PaneHeader({
  title,
  /** For panes whose tab already names them. The heading stays in the
      accessibility tree, since a tab is not a heading. */
  titleHidden,
  tools,
  meta,
}: {
  title: string;
  titleHidden?: boolean;
  tools?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.root)}>
      {titleHidden ? (
        <h1 className="sr-only" tabIndex={-1}>
          {title}
        </h1>
      ) : (
        <h1
          {...stylex.props(
            styles.title,
            Boolean(tools) && styles.titleWithTools,
          )}
          title={title}
          tabIndex={-1}
        >
          {title}
        </h1>
      )}
      {tools ? (
        <div
          {...stylex.props(
            styles.tools,
            !titleHidden && styles.toolsCompact,
          )}
        >
          {tools}
        </div>
      ) : null}
      {meta ? (
        <div role="status" {...stylex.props(styles.meta)}>
          {meta}
        </div>
      ) : null}
    </div>
  );
}
