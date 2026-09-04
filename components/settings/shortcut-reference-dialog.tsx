"use client";

import * as stylex from "@stylexjs/stylex";
import { Dialog } from "@/components/ui/dialog";
import {
  formatKeyCombo,
  KEYBIND_ACTIONS,
  KEYBIND_GROUPS,
  type KeybindMap,
} from "@/lib/mail/keybinds";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  backdrop: {
    zIndex: 20000,
    backgroundColor: "oklch(0 0 0 / 0.5)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  },
  popup: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100vh - 48px)",
    padding: 0,
    zIndex: 20001,
    borderRadius: radius.xl,
    boxShadow: elevation.overlay,
    overflow: "hidden",
  },
  body: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space[6],
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    paddingBlock: space[3],
    paddingInline: space[5],
    "@media (max-width: 700px)": {
      gridTemplateColumns: "1fr",
      gap: 0,
      paddingInline: 0,
    },
  },
  column: {
    minWidth: 0,
  },
  group: {
    display: "flex",
    flexDirection: "column",
  },
  groupTitle: {
    margin: 0,
    paddingBlockStart: space[3],
    paddingBlockEnd: space[1],
    paddingInline: 0,
    color: colors.textMuted,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 600,
    "@media (max-width: 700px)": { paddingInline: space[4] },
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(180px, auto)",
    alignItems: "center",
    gap: space[4],
    minHeight: 40,
    paddingBlock: space[1],
    paddingInline: 0,
    "@media (max-width: 520px)": {
      gridTemplateColumns: "1fr",
      gap: space[2],
      paddingBlock: space[2],
      paddingInline: space[4],
    },
  },
  action: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  bindings: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: space[1],
    "@media (max-width: 520px)": { justifyContent: "flex-start" },
  },
  key: {
    display: "inline-flex",
    minHeight: 28,
    alignItems: "center",
    paddingInline: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    whiteSpace: "nowrap",
  },
});

export function ShortcutReferenceDialog({
  open,
  onOpenChange,
  keybinds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keybinds: KeybindMap;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop {...stylex.props(styles.backdrop)} />
        <Dialog.Popup
          {...stylex.props(styles.popup)}
          style={{ width: "calc(100vw - 64px)", maxWidth: "none" }}
        >
          <Dialog.Title className="sr-only">Keyboard shortcuts</Dialog.Title>
          <Dialog.Description className="sr-only">
            Your current keyboard bindings. Edit them in Settings. Press Escape
            or click outside to close.
          </Dialog.Description>
          <div {...stylex.props(styles.body)}>
            {[
              [KEYBIND_GROUPS[0], KEYBIND_GROUPS[1]],
              [KEYBIND_GROUPS[2]],
            ].map((groups, column) => (
              <div key={column} {...stylex.props(styles.column)}>
                {groups.map((group) => (
                  <section key={group} {...stylex.props(styles.group)}>
                    <h2 {...stylex.props(styles.groupTitle)}>{group}</h2>
                    {KEYBIND_ACTIONS.filter((action) => action.group === group).map(
                      (action) => (
                        <div key={action.id} {...stylex.props(styles.row)}>
                          <span {...stylex.props(styles.action)}>{action.label}</span>
                          <span {...stylex.props(styles.bindings)}>
                            {keybinds[action.id].map((binding) => (
                              <kbd key={formatKeyCombo(binding)} {...stylex.props(styles.key)}>
                                {formatKeyCombo(binding)}
                              </kbd>
                            ))}
                          </span>
                        </div>
                      ),
                    )}
                  </section>
                ))}
              </div>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
