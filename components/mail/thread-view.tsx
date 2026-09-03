"use client";

import { useEffect, useMemo, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { CompactComposer, draftFromMessage } from "@/components/shell/compact-composer";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { formatDay } from "@/lib/format";
import { messageSpacing } from "@/lib/mail/message-grouping";
import type { ComposeInput, ThreadDetail } from "@/lib/mail/types";
import { MessageCard } from "./message-card";
import { PendingSendCard } from "./pending-send";
import type { PendingSend } from "@/lib/mail/use-pending-send";
import { pendingBelongsToThread } from "@/lib/mail/use-pending-send";
import type { ThemePreference } from "@/lib/preferences";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    maxWidth: 720,
    width: "100%",
    marginInline: "auto",
  },
  turn: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    width: "100%",
    marginBlockStart: space[4],
  },
  turnFirst: {
    marginBlockStart: 0,
  },
  turnCompact: {
    marginBlockStart: space[2],
  },
  turnSeparated: {
    marginBlockStart: space[6],
  },
  /* A date heading rather than a rule: it breaks the thread into sittings the
     way a chat log does, and gives the thread real headings to navigate by. */
  day: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlockEnd: space[3],
    margin: 0,
  },
  dayLabel: {
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    color: colors.textFaint,
  },
  reply: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space[2],
    width: "100%",
    marginBlockStart: space[6],
  },
  pending: {
    marginBlockStart: space[2],
  },
  pendingSeparated: {
    marginBlockStart: space[6],
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 0,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
  },
  actionOn: {
    backgroundColor: colors.surfaceActive,
    color: colors.text,
  },
});

export type ReplyMode = "reply" | "replyAll" | "forward";

const actionLabel: Record<ReplyMode, string> = {
  reply: "Reply",
  replyAll: "Reply all",
  forward: "Forward",
};

export function ThreadView({
  accountId,
  detail,
  userEmail,
  userName,
  sending,
  pending,
  onUndo,
  onSendNow,
  onSettled,
  recalled,
  mode,
  animateComposerEntrance,
  onMode,
  onSend,
  loadRemoteImages,
  includeRedaktFooter,
  theme,
}: {
  accountId: string;
  detail: ThreadDetail;
  userEmail: string;
  userName: string;
  sending: boolean;
  pending: PendingSend[];
  onUndo: (id: string) => void;
  onSendNow: (id: string) => void;
  onSettled: (id: string) => void;
  recalled: ComposeInput | null;
  mode: ReplyMode | null;
  animateComposerEntrance: boolean;
  onMode: (mode: ReplyMode | null) => void;
  onSend: (input: ComposeInput, files?: File[]) => Promise<string | null>;
  loadRemoteImages: boolean;
  includeRedaktFooter: boolean;
  theme: ThemePreference;
}) {
  const last = detail.messages[detail.messages.length - 1];
  const replyRef = useRef<HTMLDivElement>(null);
  const messageIds = useMemo(
    () => new Set(detail.messages.map((message) => message.id)),
    [detail.messages],
  );
  const threadPending = useMemo(
    () =>
      pending.filter((item) =>
        pendingBelongsToThread(item, detail.id, messageIds),
      ),
    [detail.id, messageIds, pending],
  );

  useEffect(() => {
    for (const item of threadPending) {
      if (
        item.status === "sent" &&
        item.delivery?.id &&
        messageIds.has(item.delivery.id)
      ) {
        onSettled(item.id);
      }
    }
  }, [messageIds, onSettled, threadPending]);

  useEffect(() => {
    if (!mode) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    replyRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [mode]);

  return (
    <div {...stylex.props(styles.root)}>
      {detail.messages.map((message, index) => {
        const previous = detail.messages[index - 1];
        const day = formatDay(message.date);
        const newDay = !previous || formatDay(previous.date) !== day;
        const spacing = messageSpacing(previous, message);
        return (
          <div
            key={message.id}
            {...stylex.props(
              styles.turn,
              !previous && styles.turnFirst,
              spacing === "compact" && styles.turnCompact,
              spacing === "separated" && styles.turnSeparated,
            )}
          >
            {newDay ? (
              <h2 {...stylex.props(styles.day)}>
                <span {...stylex.props(styles.dayLabel)}>{day}</span>
              </h2>
            ) : null}
            <MessageCard
              accountId={accountId}
              message={message}
              userEmail={userEmail}
              loadRemoteImages={loadRemoteImages}
              theme={theme}
            />
          </div>
        );
      })}
      {threadPending
        .filter(
          (item) =>
            !(
              item.status === "sent" &&
              item.delivery?.id &&
              messageIds.has(item.delivery.id)
            ),
        )
        .map((item, index) => (
          <div
            key={item.id}
            {...stylex.props(
              styles.pending,
              index === 0 && last?.from.email !== userEmail && styles.pendingSeparated,
            )}
          >
            <PendingSendCard
              pending={item}
              from={userEmail}
              fromName={userName}
              onUndo={() => onUndo(item.id)}
              onSendNow={() => onSendNow(item.id)}
              theme={theme}
            />
          </div>
        ))}
      {last ? (
        <div ref={replyRef} {...stylex.props(styles.reply)}>
          <div {...stylex.props(styles.actions)}>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={mode === "reply"}
              className={mode === "reply" ? stylex.props(styles.actionOn).className : undefined}
              style={mode === "reply" ? stylex.props(styles.actionOn).style : undefined}
              onClick={() => onMode(mode === "reply" ? null : "reply")}
            >
              <Icons.reply size={15} />
              Reply
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={mode === "replyAll"}
              className={
                mode === "replyAll" ? stylex.props(styles.actionOn).className : undefined
              }
              style={mode === "replyAll" ? stylex.props(styles.actionOn).style : undefined}
              onClick={() => onMode(mode === "replyAll" ? null : "replyAll")}
            >
              <Icons.replyAll size={15} />
              Reply all
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={mode === "forward"}
              className={
                mode === "forward" ? stylex.props(styles.actionOn).className : undefined
              }
              style={mode === "forward" ? stylex.props(styles.actionOn).style : undefined}
              onClick={() => onMode(mode === "forward" ? null : "forward")}
            >
              <Icons.forward size={15} />
              Forward
            </Button>
          </div>
          {mode ? (
            <CompactComposer
              key={`${mode}-${last.id}-${recalled ? "recalled" : "new"}`}
              mode={mode}
              heading={actionLabel[mode]}
              initial={
                recalled ??
                draftFromMessage(mode, last, userEmail, includeRedaktFooter)
              }
              sending={sending}
              animateEntrance={animateComposerEntrance}
              onSend={onSend}
              onClose={() => onMode(null)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
