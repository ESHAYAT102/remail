import type { ReactNode } from "react";
import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radius, space } from "@/theme/tokens.stylex";

export const LEGAL_CONTACT_EMAIL = "hey@stylessh.dev";

export type LegalBlock =
  | { type: "paragraph"; content: ReactNode }
  | { type: "list"; items: ReactNode[] };

export type LegalSectionContent = {
  title: string;
  blocks: LegalBlock[];
};

const styles = stylex.create({
  shell: {
    minHeight: "100vh",
    backgroundColor: colors.shell,
    color: colors.text,
  },
  header: {
    width: "min(760px, 100%)",
    minHeight: 72,
    marginInline: "auto",
    paddingInline: space[5],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[4],
    "@media (max-width: 520px)": {
      paddingInline: space[4],
    },
  },
  mark: {
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 650,
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: space[1],
  },
  navLink: {
    minHeight: 44,
    paddingInline: space[2],
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
    textDecoration: "none",
    "@media (hover: hover)": {
      ":hover": {
        color: colors.text,
        backgroundColor: colors.surfaceHover,
      },
    },
  },
  navLinkCurrent: {
    color: colors.text,
    backgroundColor: colors.surfaceActive,
  },
  main: {
    width: "min(760px, 100%)",
    marginInline: "auto",
    paddingInline: space[5],
    paddingBlockStart: space[6],
    paddingBlockEnd: 96,
    "@media (max-width: 520px)": {
      paddingInline: space[4],
      paddingBlockStart: space[5],
      paddingBlockEnd: space[7],
    },
  },
  eyebrow: {
    marginBlockEnd: space[2],
    color: colors.textFaint,
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    letterSpacing: fonts.microTrack,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  title: {
    maxWidth: "18ch",
    fontSize: "34px",
    lineHeight: 1.1,
    letterSpacing: "-0.035em",
    fontWeight: 550,
    textWrap: "balance",
    "@media (max-width: 520px)": {
      fontSize: "30px",
    },
  },
  updated: {
    marginBlockStart: space[3],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontVariantNumeric: "tabular-nums",
  },
  intro: {
    maxWidth: "64ch",
    marginBlockStart: space[5],
    color: colors.textMuted,
    fontSize: "17px",
    lineHeight: 1.6,
    textWrap: "pretty",
  },
  sections: {
    marginBlockStart: space[7],
    display: "flex",
    flexDirection: "column",
    gap: space[7],
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
    scrollMarginBlockStart: space[6],
  },
  sectionTitle: {
    maxWidth: "32ch",
    color: colors.text,
    fontSize: "20px",
    lineHeight: 1.3,
    letterSpacing: "-0.015em",
    fontWeight: 600,
    textWrap: "balance",
  },
  paragraph: {
    maxWidth: "72ch",
    color: colors.textMuted,
    fontSize: "16px",
    lineHeight: 1.65,
    overflowWrap: "break-word",
  },
  list: {
    maxWidth: "72ch",
    paddingInlineStart: space[5],
    display: "flex",
    flexDirection: "column",
    gap: space[2],
    color: colors.textMuted,
    fontSize: "16px",
    lineHeight: 1.65,
  },
  inlineLink: {
    color: colors.accentText,
    fontWeight: 500,
    textDecorationLine: "underline",
    textDecorationThickness: "from-font",
    textUnderlinePosition: "from-font",
    textDecorationSkipInk: "auto",
    overflowWrap: "anywhere",
    "@media (hover: hover)": {
      ":hover": {
        color: colors.text,
      },
    },
  },
  footer: {
    marginBlockStart: space[7],
    paddingBlockStart: space[5],
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space[4],
    color: colors.textFaint,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
  },
});

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className = stylex.props(styles.inlineLink);
  return href.startsWith("/") ? (
    <Link href={href} {...className}>
      {children}
    </Link>
  ) : (
    <a href={href} {...className}>
      {children}
    </a>
  );
}

export function LegalPage({
  active,
  title,
  intro,
  sections,
}: {
  active: "privacy" | "terms";
  title: string;
  intro: ReactNode;
  sections: LegalSectionContent[];
}) {
  return (
    <div {...stylex.props(styles.shell)}>
      <header {...stylex.props(styles.header)}>
        <Link href="/" {...stylex.props(styles.mark)}>
          Remail
        </Link>
        <nav aria-label="Legal" {...stylex.props(styles.nav)}>
          <Link
            href="/privacy"
            aria-current={active === "privacy" ? "page" : undefined}
            {...stylex.props(
              styles.navLink,
              active === "privacy" && styles.navLinkCurrent,
            )}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            aria-current={active === "terms" ? "page" : undefined}
            {...stylex.props(
              styles.navLink,
              active === "terms" && styles.navLinkCurrent,
            )}
          >
            Terms
          </Link>
        </nav>
      </header>

      <main id="main" {...stylex.props(styles.main)}>
        <p {...stylex.props(styles.eyebrow)}>Legal</p>
        <h1 {...stylex.props(styles.title)}>{title}</h1>
        <p {...stylex.props(styles.updated)}>Effective September 2, 2026</p>
        <div {...stylex.props(styles.intro)}>{intro}</div>

        <div {...stylex.props(styles.sections)}>
          {sections.map((section, index) => (
            <section key={section.title} {...stylex.props(styles.section)}>
              <h2 {...stylex.props(styles.sectionTitle)}>
                {index + 1}. {section.title}
              </h2>
              {section.blocks.map((block, blockIndex) =>
                block.type === "paragraph" ? (
                  <p key={blockIndex} {...stylex.props(styles.paragraph)}>
                    {block.content}
                  </p>
                ) : (
                  <ul key={blockIndex} {...stylex.props(styles.list)}>
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </div>

        <footer {...stylex.props(styles.footer)}>
          <span>Remail</span>
          <LegalLink href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </LegalLink>
        </footer>
      </main>
    </div>
  );
}
