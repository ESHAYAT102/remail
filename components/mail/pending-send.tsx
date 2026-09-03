"use client";

import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { UNDO_WINDOW_MS, type PendingSend } from "@/lib/mail/use-pending-send";
import type { Attachment } from "@/lib/mail/types";
import type { ThemePreference } from "@/lib/preferences";
import { MessageBody } from "./message-body";
import { MessageCardFrame } from "./message-card";

const noAttachments: Attachment[] = [];

const styles = stylex.create({
  who: { color: colors.text, fontWeight: 500 },
  /* Tucked under the card so it reads as a second sheet, not a banner. */
  tray: {
    /* Anchor the offscreen live region inside the reader instead of letting
       its static position expand the root document. */
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: space[3],
    marginTop: -20,
    paddingTop: 20 + 12,
    paddingInline: space[4],
    paddingBottom: space[3],
    borderEndStartRadius: radius["3xl"],
    borderEndEndRadius: radius["3xl"],
    boxShadow: elevation.control,
    backgroundColor: colors.shell,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    overflow: "hidden",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, color, opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  traySent: {
    backgroundColor: colors.okSoft,
    color: colors.ok,
  },
  count: { color: colors.text, fontVariantNumeric: "tabular-nums" },
  queueStatus: {
    flex: 1,
    minWidth: "max-content",
  },
  row: {
    /* The list version carries the same offscreen queued-message status. */
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    marginInline: space[2],
    marginBlockStart: space[2],
    marginBlockEnd: space[2],
    paddingInlineStart: space[4],
    paddingInlineEnd: space[2],
    paddingBlock: space[2],
    borderRadius: radius["2xl"],
    boxShadow: elevation.lift,
    backgroundColor: colors.surfaceGlass,
    backgroundImage: colors.raised,
    backdropFilter: "blur(16px)",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, color, opacity, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  rowSent: {
    backgroundColor: colors.okSoft,
    color: colors.ok,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[1],
    flexShrink: 0,
    marginInlineStart: "auto",
  },
  state: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    flex: 1,
    minWidth: 0,
  },
  failure: {
    color: colors.danger,
    textWrap: "pretty",
  },
});

export function PendingSendCard({
  pending,
  from,
  fromName,
  onUndo,
  onSendNow,
  theme,
}: {
  pending: PendingSend;
  from: string;
  fromName: string;
  onUndo: () => void;
  onSendNow: () => void;
  theme: ThemePreference;
}) {
  const left = useCountdown(pending.sendAt);
  const senderId = `pending-from-${pending.id}`;
  const queuedAt = new Date(pending.queuedAt).toISOString();
  const to = pendingAudience(pending.input.to, pending.input.cc);

  return (
    <MessageCardFrame
      senderId={senderId}
      avatarName={from}
      senderLabel="You"
      senderTitle={from}
      audience={to}
      date={pending.delivery?.sentAt ?? queuedAt}
      busy={pending.status === "sending"}
      after={
        <div {...stylex.props(styles.tray, pending.status === "sent" && styles.traySent)}>
          {/* The number changes every second; announcing each tick would flood a
              screen reader, so only the one-time queued notice is live. */}
          <div {...stylex.props(styles.state)}>
            {pending.status === "sent" ? <Icons.check size={15} /> : null}
            <p aria-hidden {...stylex.props(styles.queueStatus, pending.status === "failed" && styles.failure)}>
              {pendingStatus(pending, left)}
            </p>
          </div>
          <p role="status" className="sr-only">
            {pending.status === "queued"
              ? `Message queued. You can undo or send now for ${UNDO_WINDOW_MS / 1000} seconds.`
              : pending.status === "sending"
                ? "Sending message."
                : pending.status === "sent"
                  ? "Message sent."
                  : ""}
          </p>
          {pending.status === "failed" ? (
            <p role="alert" className="sr-only">{pending.error}</p>
          ) : null}
          {pending.status === "queued" || pending.status === "failed" ? (
            <div {...stylex.props(styles.actions)}>
              <Button type="button" variant="ghost" onClick={onUndo}>
                {pending.status === "failed" ? "Edit" : "Undo"}
              </Button>
              <Button type="button" onClick={onSendNow}>
                <Icons.sent size={14} />
                {pending.status === "failed" ? "Try again" : "Send now"}
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <MessageBody
        html={pending.input.html}
        text={pending.input.text}
        attachments={noAttachments}
        label={`Queued message from ${fromName || from}`}
        labelledBy={senderId}
        theme={theme}
      />
    </MessageCardFrame>
  );
}

/** The list-pane form: one line, no message sheet to tuck under. */
export function PendingSendRow({
  pending,
  onUndo,
  onSendNow,
}: {
  pending: PendingSend;
  onUndo: () => void;
  onSendNow: () => void;
}) {
  const left = useCountdown(pending.sendAt);

  return (
    <div
      aria-busy={pending.status === "sending"}
      {...stylex.props(styles.row, pending.status === "sent" && styles.rowSent)}
    >
      <p {...stylex.props(styles.rowText)}>
        <span {...stylex.props(styles.who)}>{pending.input.subject || "No subject"}</span> to{" "}
        {pending.input.to}
      </p>
      <p aria-hidden {...stylex.props(pending.status === "failed" && styles.failure)}>
        {pendingStatus(pending, left)}
      </p>
      <p role="status" className="sr-only">
        {pending.status === "queued"
          ? `Message queued. You can undo or send now for ${UNDO_WINDOW_MS / 1000} seconds.`
          : pending.status === "sending"
            ? "Sending message."
            : pending.status === "sent"
              ? "Message sent."
              : ""}
      </p>
      {pending.status === "failed" ? (
        <p role="alert" className="sr-only">{pending.error}</p>
      ) : null}
      {pending.status === "queued" || pending.status === "failed" ? (
        <div {...stylex.props(styles.actions)}>
          <Button type="button" variant="ghost" onClick={onUndo}>
            {pending.status === "failed" ? "Edit" : "Undo"}
          </Button>
          <Button type="button" onClick={onSendNow}>
            <Icons.sent size={14} />
            {pending.status === "failed" ? "Try again" : "Send now"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function useCountdown(sendAt: number) {
  const [left, setLeft] = useState(() => remaining(sendAt));
  useEffect(() => {
    const tick = setInterval(() => setLeft(remaining(sendAt)), 1000);
    return () => clearInterval(tick);
  }, [sendAt]);
  return left;
}

function remaining(sendAt: number) {
  return Math.max(0, Math.ceil((sendAt - Date.now()) / 1000));
}

function pendingStatus(pending: PendingSend, seconds: number) {
  if (pending.status === "queued") return `Sending in ${seconds}s`;
  if (pending.status === "sending") return "Sending…";
  if (pending.status === "sent") return "Sent";
  return pending.error ?? "Unable to send. Check your connection and try again.";
}

function pendingAudience(to: string, cc?: string) {
  const recipients = [to, cc ?? ""]
    .flatMap((value) => value.split(/[,;]+/))
    .map((value) => value.trim())
    .filter(Boolean);
  if (recipients.length === 0) return null;
  if (recipients.length <= 2) return `to ${recipients.join(" and ")}`;
  return `to ${recipients[0]} and ${recipients.length - 1} others`;
}
