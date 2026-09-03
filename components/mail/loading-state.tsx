"use client";

import * as stylex from "@stylexjs/stylex";
import { colors, elevation, radius, space } from "@/theme/tokens.stylex";

const breathe = stylex.keyframes({
  "0%, 100%": { opacity: 0.48 },
  "50%": { opacity: 0.8 },
});

const styles = stylex.create({
  route: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minHeight: 44,
    paddingInline: space[4],
    paddingBlock: space[2],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  headerTitle: {
    width: 176,
    maxWidth: "28%",
    height: 16,
    "@media (max-width: 640px)": {
      width: 112,
      maxWidth: "40%",
    },
  },
  threadToolbar: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    marginInlineStart: "auto",
  },
  threadAction: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
  },
  threadActionSecondary: {
    "@media (max-width: 720px)": {
      display: "none",
    },
  },
  threadCount: {
    width: 62,
    height: 10,
    marginInline: space[1],
    "@media (max-width: 900px)": {
      display: "none",
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: space[1],
    width: "100%",
    minWidth: 0,
  },
  toolbarSpacer: {
    flex: 1,
    minWidth: 0,
  },
  toolbarIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    flexShrink: 0,
  },
  toolbarButton: {
    width: 92,
    height: 32,
    borderRadius: radius.lg,
    flexShrink: 0,
    "@media (max-width: 760px)": {
      width: 32,
    },
  },
  toolbarButtonWide: {
    width: 104,
    "@media (max-width: 760px)": {
      width: 32,
    },
  },
  listViewport: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "100%",
    paddingInline: space[2],
    paddingBlock: space[1],
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    width: "100%",
    minHeight: 40,
    paddingBlock: 10,
    paddingInlineStart: space[2],
    paddingInlineEnd: space[3],
  },
  rowSelectionSlot: {
    display: "flex",
    width: 24,
    height: 16,
    alignItems: "center",
    flexShrink: 0,
  },
  rowSelection: {
    width: 16,
    height: 16,
    borderRadius: radius.sm,
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  rowSender: {
    width: 120,
    height: 12,
    flexShrink: 0,
    "@media (max-width: 520px)": {
      width: 72,
    },
  },
  rowBody: {
    flex: 1,
    minWidth: 24,
    height: 12,
  },
  rowBodyMedium: {
    maxWidth: "72%",
  },
  rowBodyShort: {
    maxWidth: "52%",
  },
  rowTime: {
    width: 104,
    height: 10,
    flexShrink: 0,
    "@media (max-width: 520px)": {
      width: "3.25em",
    },
  },
  reader: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    paddingInline: space[4],
    paddingBlock: space[4],
  },
  thread: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    maxWidth: 720,
    width: "100%",
    marginInline: "auto",
  },
  message: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
    width: "100%",
    paddingInline: space[4],
    paddingBlock: space[3],
    borderRadius: radius["3xl"],
    backgroundColor: colors.surface,
    boxShadow: elevation.control,
  },
  messageSeparated: {
    marginBlockStart: space[6],
  },
  messageCompact: {
    marginBlockStart: space[2],
  },
  messageHead: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  senderStack: {
    display: "flex",
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    gap: space[1],
  },
  senderLine: {
    width: 136,
    maxWidth: "64%",
    height: 12,
  },
  audienceLine: {
    width: 96,
    maxWidth: "44%",
    height: 9,
  },
  messageTime: {
    width: 38,
    height: 9,
    flexShrink: 0,
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: space[2],
    paddingBlock: space[1],
  },
  line: {
    height: 10,
    width: "100%",
  },
  lineMedium: {
    width: "72%",
  },
  lineShort: {
    width: "44%",
  },
  replyActions: {
    display: "flex",
    gap: space[1],
    marginBlockStart: space[6],
    padding: space[1],
    width: "fit-content",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
  },
  replyAction: {
    width: 76,
    height: 32,
    borderRadius: radius.lg,
    "@media (max-width: 420px)": {
      width: 64,
    },
  },
  domain: {
    width: "100%",
    maxWidth: 720,
    paddingBlock: space[4],
  },
  domainLead: {
    width: "72%",
    maxWidth: 480,
    height: 12,
    marginBlockEnd: space[5],
  },
  domainRow: {
    display: "flex",
    gap: space[3],
    width: "100%",
    marginBlockEnd: space[4],
  },
  domainField: {
    flex: 1,
    height: 32,
    borderRadius: radius.md,
  },
  domainAction: {
    width: 116,
    height: 32,
    borderRadius: radius.lg,
  },
  bone: {
    display: "block",
    backgroundColor: colors.surfaceActive,
    opacity: 0.64,
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: breathe,
      animationDuration: "1600ms",
      animationIterationCount: "infinite",
      animationTimingFunction: "ease-in-out",
    },
  },
});

function LoadingStatus({ children }: { children: string }) {
  return (
    <span className="sr-only" role="status">
      {children}
    </span>
  );
}

function FolderHeaderSkeleton() {
  return (
    <div {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.toolbar)}>
        <span {...stylex.props(styles.bone, styles.toolbarIcon)} />
        <span {...stylex.props(styles.toolbarSpacer)} />
        <span {...stylex.props(styles.bone, styles.toolbarButton)} />
        <span
          {...stylex.props(
            styles.bone,
            styles.toolbarButton,
            styles.toolbarButtonWide,
          )}
        />
      </div>
    </div>
  );
}

function PaneHeaderSkeleton({ threadTools = false }: { threadTools?: boolean }) {
  return (
    <div {...stylex.props(styles.header)}>
      <span {...stylex.props(styles.bone, styles.headerTitle)} />
      {threadTools ? (
        <div {...stylex.props(styles.threadToolbar)}>
          <span {...stylex.props(styles.bone, styles.threadAction)} />
          <span
            {...stylex.props(
              styles.bone,
              styles.threadAction,
              styles.threadActionSecondary,
            )}
          />
          <span
            {...stylex.props(
              styles.bone,
              styles.threadAction,
              styles.threadActionSecondary,
            )}
          />
          <span {...stylex.props(styles.bone, styles.threadAction)} />
          <span {...stylex.props(styles.bone, styles.threadCount)} />
          <span {...stylex.props(styles.bone, styles.threadAction)} />
          <span {...stylex.props(styles.bone, styles.threadAction)} />
        </div>
      ) : null}
    </div>
  );
}

export function ThreadListSkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} {...stylex.props(styles.row)}>
          <span {...stylex.props(styles.rowSelectionSlot)}>
            <span {...stylex.props(styles.bone, styles.rowSelection)} />
          </span>
          <span {...stylex.props(styles.bone, styles.rowDot)} />
          <span {...stylex.props(styles.bone, styles.rowSender)} />
          <span
            {...stylex.props(
              styles.bone,
              styles.rowBody,
              index % 3 === 1 && styles.rowBodyMedium,
              index % 3 === 2 && styles.rowBodyShort,
            )}
          />
          <span {...stylex.props(styles.bone, styles.rowTime)} />
        </div>
      ))}
    </div>
  );
}

export function MailFolderLoading() {
  return (
    <div aria-busy="true" {...stylex.props(styles.route)}>
      <LoadingStatus>Loading messages</LoadingStatus>
      <div aria-hidden="true">
        <FolderHeaderSkeleton />
      </div>
      <div {...stylex.props(styles.listViewport)}>
        <div {...stylex.props(styles.list)}>
          <ThreadListSkeletonRows />
        </div>
      </div>
    </div>
  );
}

function MessageSkeleton({
  spacing,
}: {
  spacing?: "compact" | "separated";
}) {
  return (
    <div
      {...stylex.props(
        styles.message,
        spacing === "compact" && styles.messageCompact,
        spacing === "separated" && styles.messageSeparated,
      )}
    >
      <div {...stylex.props(styles.messageHead)}>
        <span {...stylex.props(styles.bone, styles.avatar)} />
        <div {...stylex.props(styles.senderStack)}>
          <span {...stylex.props(styles.bone, styles.senderLine)} />
          <span {...stylex.props(styles.bone, styles.audienceLine)} />
        </div>
        <span {...stylex.props(styles.bone, styles.messageTime)} />
      </div>
      <div {...stylex.props(styles.copy)}>
        <span {...stylex.props(styles.bone, styles.line)} />
        <span {...stylex.props(styles.bone, styles.line, styles.lineMedium)} />
        <span {...stylex.props(styles.bone, styles.line, styles.lineShort)} />
      </div>
    </div>
  );
}

export function MailThreadLoading() {
  return (
    <div aria-busy="true" {...stylex.props(styles.route)}>
      <LoadingStatus>Loading conversation</LoadingStatus>
      <div aria-hidden="true">
        <PaneHeaderSkeleton threadTools />
      </div>
      <div {...stylex.props(styles.reader)}>
        <div aria-hidden="true" {...stylex.props(styles.thread)}>
          <MessageSkeleton />
          <MessageSkeleton spacing="compact" />
          <MessageSkeleton spacing="separated" />
          <div {...stylex.props(styles.replyActions)}>
            <span {...stylex.props(styles.bone, styles.replyAction)} />
            <span {...stylex.props(styles.bone, styles.replyAction)} />
            <span {...stylex.props(styles.bone, styles.replyAction)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MailDomainLoading() {
  return (
    <div aria-busy="true" {...stylex.props(styles.route)}>
      <LoadingStatus>Loading domain setup</LoadingStatus>
      <div aria-hidden="true">
        <PaneHeaderSkeleton />
      </div>
      <div {...stylex.props(styles.reader)}>
        <div aria-hidden="true" {...stylex.props(styles.domain)}>
          <span {...stylex.props(styles.bone, styles.domainLead)} />
          <div {...stylex.props(styles.domainRow)}>
            <span {...stylex.props(styles.bone, styles.domainField)} />
            <span {...stylex.props(styles.bone, styles.domainField)} />
            <span {...stylex.props(styles.bone, styles.domainAction)} />
          </div>
        </div>
      </div>
    </div>
  );
}
