"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";
import { formatShortWhen } from "@/lib/format";
import type { LoginFields } from "@/lib/login";
import { LoginForm } from "./login-form";

const spring = { type: "spring" as const, duration: 0.3, bounce: 0 };

const cards = [
  {
    from: "Remail",
    subject: "Welcome to Remail",
    snippet: "Your mailbox is ready.",
    date: "2026-08-31T14:12:00.000Z",
    unread: true,
    left: "-2%",
    rotate: -9,
    sink: 40,
  },
  {
    from: "Northline Studio",
    subject: "Invoice 1842 is ready",
    snippet: "August retainer, due September 14.",
    date: "2026-08-30T20:40:00.000Z",
    unread: false,
    left: "8%",
    rotate: 4,
    sink: 56,
  },
  {
    from: "Mira Chen",
    subject: "Notes from Thursday",
    snippet: "Three things I don’t want to lose.",
    date: "2026-08-28T23:05:00.000Z",
    unread: false,
    left: "18%",
    rotate: -3,
    sink: 22,
  },
  {
    from: "Ada Meridian",
    subject: "Re: Kickoff tomorrow",
    snippet: "I’ll send the agenda tonight.",
    date: "2026-08-31T11:04:00.000Z",
    unread: false,
    left: "30%",
    rotate: 6,
    sink: 48,
  },
  {
    from: "Remail",
    subject: "Your domain is live",
    snippet: "Mailboxes are ready to receive.",
    date: "2026-08-31T06:56:00.000Z",
    unread: true,
    left: "40%",
    rotate: -6,
    sink: 30,
  },
  {
    from: "Fieldnotes",
    subject: "Design review",
    snippet: "Comments on the reader and the list.",
    date: "2026-08-29T16:20:00.000Z",
    unread: true,
    left: "52%",
    rotate: 3,
    sink: 18,
  },
  {
    from: "Orbit Labs",
    subject: "Keys rotated",
    snippet: "DKIM is publishing on the new selector.",
    date: "2026-08-30T09:18:00.000Z",
    unread: false,
    left: "62%",
    rotate: -7,
    sink: 50,
  },
  {
    from: "Jules Park",
    subject: "Draft for Friday",
    snippet: "Can you look at the second paragraph?",
    date: "2026-08-31T18:40:00.000Z",
    unread: true,
    left: "72%",
    rotate: 5,
    sink: 28,
  },
  {
    from: "Harbor Freight",
    subject: "Receipt for order 4401",
    snippet: "Delivered to the studio this morning.",
    date: "2026-08-27T15:02:00.000Z",
    unread: false,
    left: "82%",
    rotate: -4,
    sink: 42,
  },
  {
    from: "Remail",
    subject: "Two people joined",
    snippet: "hello@ and billing@ are active.",
    date: "2026-08-31T08:22:00.000Z",
    unread: true,
    left: "92%",
    rotate: 8,
    sink: 34,
  },
];

const cardStagger = 2 / (cards.length - 1);

const styles = stylex.create({
  stage: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.shell,
    paddingInline: space[5],
    paddingBlockStart: space[6],
    paddingBlockEnd: 200,
  },
  stack: {
    position: "relative",
    zIndex: 1,
    width: "min(360px, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: space[4],
  },
  mark: {
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    letterSpacing: fonts.microTrack,
    color: colors.textFaint,
    fontWeight: 550,
    textTransform: "uppercase",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  title: {
    fontSize: fonts.displaySize,
    lineHeight: 1.15,
    fontWeight: 500,
    color: colors.text,
    letterSpacing: "-0.03em",
    textWrap: "balance",
    overflowWrap: "break-word",
  },
  lead: {
    fontSize: fonts.titleSize,
    lineHeight: fonts.bodyLine,
    color: colors.textMuted,
    maxWidth: "42ch",
    textWrap: "pretty",
    overflowWrap: "break-word",
  },
  legalNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: space[1],
  },
  legalLink: {
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
    paddingInline: space[2],
    borderRadius: radius.md,
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    textDecoration: "none",
    "@media (hover: hover)": {
      ":hover": {
        color: colors.text,
        backgroundColor: colors.surfaceHover,
      },
    },
    "@media (max-width: 640px)": {
      minHeight: 44,
    },
  },
  deck: {
    position: "absolute",
    insetInline: 0,
    insetBlockEnd: 0,
    height: 220,
    pointerEvents: "none",
    overflow: "hidden",
    "@media (max-width: 720px)": {
      display: "none",
    },
  },
  card: {
    position: "absolute",
    insetBlockEnd: 0,
    width: 240,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: "color-mix(in oklch, var(--color-9) 78%, transparent)",
    backdropFilter: "blur(16px)",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: radius.full,
    backgroundColor: "oklch(0.62 0.19 250)",
  },
  from: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    color: colors.textMuted,
  },
  when: {
    marginInlineStart: "auto",
    flexShrink: 0,
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    color: colors.textFaint,
    fontVariantNumeric: "tabular-nums",
  },
  subject: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    color: colors.text,
  },
  snippet: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textFaint,
  },
});

function shuffleRanks(length: number) {
  const ranks = Array.from({ length }, (_, index) => index);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return ranks;
}

export function LoginScreen({
  initialLogin,
  initialError,
  googleEnabled,
  addingAccount = false,
}: {
  initialLogin: LoginFields;
  initialError?: string;
  googleEnabled: boolean;
  addingAccount?: boolean;
}) {
  const reduce = useReducedMotion();
  const [order, setOrder] = useState<number[] | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOrder(shuffleRanks(cards.length));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main id="main" {...stylex.props(styles.stage)}>
      <div {...stylex.props(styles.stack)}>
        <div {...stylex.props(styles.mark)}>Remail</div>
        <div {...stylex.props(styles.copy)}>
          <h1 {...stylex.props(styles.title)}>
            {addingAccount ? "Add another account" : "Email, without the noise."}
          </h1>
          <p {...stylex.props(styles.lead)}>
            {addingAccount
              ? "Sign in to another Remail account. Your current account will stay available on this device."
              : "Host mailboxes on a domain you control, then read and send from one quiet inbox."}
          </p>
        </div>
        <LoginForm
          initialLogin={initialLogin}
          initialError={initialError}
          googleEnabled={googleEnabled}
          addingAccount={addingAccount}
        />
        <nav aria-label="Legal" {...stylex.props(styles.legalNav)}>
          <Link href="/privacy" {...stylex.props(styles.legalLink)}>
            Privacy policy
          </Link>
          <Link href="/terms" {...stylex.props(styles.legalLink)}>
            Terms of service
          </Link>
          <a href="mailto:hey@stylessh.dev" {...stylex.props(styles.legalLink)}>
            Contact
          </a>
        </nav>
      </div>

      <div {...stylex.props(styles.deck)} aria-hidden="true">
        {cards.map((card, index) => {
          const sx = stylex.props(styles.card);
          return (
            <motion.div
              key={`${card.subject}-${index}`}
              className={sx.className}
              style={{
                ...sx.style,
                left: card.left,
                marginBottom: -card.sink,
              }}
              initial={
                reduce || !order
                  ? false
                  : { opacity: 0, y: 64, rotate: card.rotate + 6 }
              }
              animate={
                reduce || order
                  ? { opacity: 1, y: 0, rotate: card.rotate }
                  : { opacity: 0, y: 64, rotate: card.rotate + 6 }
              }
              transition={{
                ...spring,
                delay: order ? order[index] * cardStagger : 0,
              }}
            >
              <div {...stylex.props(styles.cardTop)}>
                {card.unread ? <span {...stylex.props(styles.dot)} /> : null}
                <span {...stylex.props(styles.from)}>{card.from}</span>
                <span {...stylex.props(styles.when)}>{formatShortWhen(card.date)}</span>
              </div>
              <div {...stylex.props(styles.subject)}>{card.subject}</div>
              <div {...stylex.props(styles.snippet)}>{card.snippet}</div>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
