import * as stylex from "@stylexjs/stylex";
import { MailFolderLoading } from "@/components/mail/loading-state";
import { Icons } from "@/components/ui/icons";
import { workspaceListProps, workspaceTabProps } from "@/components/ui/tabs";
import { colors, elevation, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  shell: {
    display: "flex",
    height: "100vh",
    backgroundColor: colors.shell,
    overflow: "hidden",
    paddingInline: space[2],
    paddingBottom: space[2],
    gap: space[1],
    "@media (max-width: 640px)": {
      paddingInline: 0,
      paddingBottom: 0,
    },
  },
  sidebar: {
    width: 216,
    flexShrink: 0,
    "@media (max-width: 640px)": {
      display: "none",
    },
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  tabBar: {
    display: "flex",
    alignItems: "flex-end",
    minHeight: 36,
    paddingInlineEnd: 4,
    paddingTop: 8,
  },
  tabLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    cursor: "default",
  },
  pane: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderStartStartRadius: 0,
    boxShadow: elevation.panel,
    overflow: "hidden",
    "@media (max-width: 640px)": {
      borderRadius: 0,
      boxShadow: "none",
    },
  },
});

export function MailShellLoading() {
  return (
    <div
      data-mail-shell-loading=""
      aria-busy="true"
      {...stylex.props(styles.shell)}
    >
      <span className="sr-only" role="status">
        Loading mail
      </span>
      <aside aria-hidden {...stylex.props(styles.sidebar)} />
      <main id="main" {...stylex.props(styles.main)}>
        <div aria-hidden {...stylex.props(styles.tabBar)}>
          <div {...workspaceListProps()}>
            <div {...workspaceTabProps(true, true, true)}>
              <span {...stylex.props(styles.tabLabel)}>
                <Icons.inbox size={13} />
                Inbox
              </span>
            </div>
          </div>
        </div>
        <div aria-hidden suppressHydrationWarning {...stylex.props(styles.pane)}>
          <MailFolderLoading />
        </div>
      </main>
    </div>
  );
}
