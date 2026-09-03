"use client";

import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@/components/ui/avatar";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import { bytes, formatTime, formatWhen } from "@/lib/format";
import type { Address, Message } from "@/lib/mail/types";
import type { ThemePreference } from "@/lib/preferences";
import { MessageBody } from "./message-body";

/** How far the attachment tray tucks under the card's bottom corners. */
const radiusOverlap = 20;

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  card: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: space[3],
    paddingInline: space[4],
    paddingBlock: space[3],
    borderRadius: radius["3xl"],
    borderWidth: 0,
    /* A thread stacks a dozen of these. The big card shadow pools where they
       meet, so each one gets the quiet ring instead. */
    boxShadow: elevation.control,
    backgroundColor: colors.surface,
  },
  head: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
  },
  who: {
    display: "flex",
    alignItems: "baseline",
    gap: space[2],
    minWidth: 0,
    flex: 1,
  },
  sender: {
    flexShrink: 0,
    maxWidth: "60%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 600,
    color: colors.text,
    margin: 0,
  },
  audience: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
  },
  when: {
    flexShrink: 0,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    minWidth: 0,
  },
  /* Attachments ride under the message like a second sheet, so the card above
     stays purely the message the sender wrote. */
  tray: {
    display: "flex",
    flexWrap: "wrap",
    gap: space[2],
    marginTop: -radiusOverlap,
    paddingTop: radiusOverlap + 10,
    paddingInline: space[4],
    paddingBottom: space[3],
    borderEndStartRadius: radius["3xl"],
    borderEndEndRadius: radius["3xl"],
    boxShadow: elevation.control,
    backgroundColor: colors.shell,
  },
  file: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    maxWidth: "100%",
    minHeight: 32,
    /* Downloads are a primary action; give them a full touch target where
       there is no hover to aim with. */
    "@media (hover: none)": {
      minHeight: 44,
    },
    paddingInline: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: elevation.control,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    textDecoration: "none",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "color, background-color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text },
    },
  },
  fileName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    flexShrink: 0,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
});

type MessageCardFrameProps = {
  senderId: string;
  avatarName: string;
  senderLabel: string;
  senderTitle: string;
  audience?: string | null;
  date: string;
  children: React.ReactNode;
  after?: React.ReactNode;
  busy?: boolean;
};

/** Shared message geometry for delivered and queued mail in a thread. */
export function MessageCardFrame({
  senderId,
  avatarName,
  senderLabel,
  senderTitle,
  audience,
  date,
  children,
  after,
  busy,
}: MessageCardFrameProps) {
  return (
    <article {...stylex.props(styles.stack)} aria-labelledby={senderId} aria-busy={busy}>
      <div {...stylex.props(styles.card)}>
        <header {...stylex.props(styles.head)}>
          <Avatar name={avatarName} />
          <div {...stylex.props(styles.who)}>
            <h3 id={senderId} {...stylex.props(styles.sender)} title={senderTitle}>
              {senderLabel}
            </h3>
            {audience ? <span {...stylex.props(styles.audience)}>{audience}</span> : null}
          </div>
          <time dateTime={date} title={formatWhen(date)} {...stylex.props(styles.when)}>
            {formatTime(date)}
          </time>
        </header>
        <div {...stylex.props(styles.body)}>{children}</div>
      </div>
      {after}
    </article>
  );
}

function label(address: Address, userEmail: string) {
  if (address.email === userEmail) return "me";
  return address.name || address.email;
}

/** "to me", "to me and Mira Chen", "to Mira Chen and 2 others". */
function audience(message: Message, userEmail: string) {
  const names = [...message.to, ...(message.cc ?? [])].map((item) =>
    label(item, userEmail),
  );
  if (names.length === 0) return null;
  if (names.length <= 2) return `to ${names.join(" and ")}`;
  return `to ${names[0]} and ${names.length - 1} others`;
}

export function MessageCard({
  accountId,
  message,
  userEmail,
  loadRemoteImages,
  theme,
}: {
  accountId: string;
  message: Message;
  userEmail: string;
  loadRemoteImages: boolean;
  theme: ThemePreference;
}) {
  const sender = message.from.name || message.from.email;
  const isMe = message.from.email === userEmail;
  const files = message.attachments.filter((file) => !file.inline);
  const to = audience(message, userEmail);
  // Names both the card and the body frame, so entering the frame does not
  // lose track of who is speaking.
  const senderId = `msg-from-${message.id}`;

  return (
    <MessageCardFrame
      senderId={senderId}
      avatarName={message.from.email}
      senderLabel={isMe ? "You" : sender}
      senderTitle={message.from.email}
      audience={to}
      date={message.date}
      after={
        files.length > 0 ? (
          <div {...stylex.props(styles.tray)}>
            {files.map((file) => (
              <a
                key={file.id}
                href={`/api/mail/attachments/${encodeURIComponent(file.id)}?account=${encodeURIComponent(accountId)}&filename=${encodeURIComponent(file.filename)}`}
                download={file.filename}
                {...stylex.props(styles.file)}
              >
                <Icons.attach size={14} />
                <span {...stylex.props(styles.fileName)}>{file.filename}</span>
                <span {...stylex.props(styles.fileSize)}>{bytes(file.size)}</span>
              </a>
            ))}
          </div>
        ) : null
      }
    >
      <MessageBody
        html={message.html}
        text={message.text}
        attachments={message.attachments}
        label={`Message from ${sender}`}
        labelledBy={senderId}
        loadRemoteImages={loadRemoteImages}
        theme={theme}
      />
    </MessageCardFrame>
  );
}
