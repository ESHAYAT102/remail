"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { useMailShell } from "@/components/shell/app-shell";
import { Icons } from "@/components/ui/icons";
import {
  mailFolderHref,
  mailSettingsHref,
  mailSettingsSectionIds,
} from "@/lib/mail/routes";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const labels = {
  account: "Account",
  appearance: "Appearance & reading",
  keybinds: "Keyboard shortcuts",
  security: "Security",
} as const;

const sectionIcons = {
  account: Icons.sender,
  appearance: Icons.appearance,
  keybinds: Icons.keyboard,
  security: Icons.security,
} as const;

const styles = stylex.create({
  shell: {
    display: "grid",
    gridTemplateColumns: "216px minmax(0, 1fr)",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    "@media (max-width: 760px)": {
      display: "flex",
      flexDirection: "column",
      overflow: "auto",
    },
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: space[1],
    padding: space[2],
    overflow: "auto",
    "@media (max-width: 760px)": {
      flexDirection: "row",
      alignItems: "center",
      overflowX: "auto",
      flexShrink: 0,
      paddingBlock: space[2],
      paddingInline: space[3],
      borderInlineEndWidth: 0,
      borderBlockEndWidth: 1,
      borderBlockEndStyle: "solid",
      borderBlockEndColor: colors.line,
    },
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    width: "100%",
    height: 36,
    paddingInline: 10,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    color: colors.textMuted,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 450,
    textDecoration: "none",
    whiteSpace: "nowrap",
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "color, transform",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceHover, color: colors.text },
    },
    "@media (max-width: 760px)": {
      width: "max-content",
      flexShrink: 0,
    },
  },
  navLinkActive: {
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    fontWeight: 500,
    "@media (hover: hover)": {
      ":hover": { backgroundColor: colors.surfaceActive },
    },
  },
  navIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 15,
    height: 15,
    flexShrink: 0,
  },
  back: {
    gap: space[2],
    marginBottom: space[3],
    "@media (max-width: 760px)": { marginBottom: 0 },
  },
  content: {
    minWidth: 0,
    overflow: "auto",
    paddingBlockStart: space[7],
    paddingBlockEnd: space[6],
    paddingInline: space[6],
    "@media (max-width: 640px)": {
      paddingBlockStart: space[6],
      paddingBlockEnd: space[5],
      paddingInline: space[4],
    },
  },
  contentInner: {
    width: "100%",
    maxWidth: 720,
    marginInline: "auto",
  },
});

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account, registerView } = useMailShell();
  const settingsNavRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    registerView({
      id: "settings",
      kind: "settings",
      title: "Settings",
      href: pathname,
    });
  }, [pathname, registerView]);

  useEffect(() => {
    const showActiveLink = () => {
      activeLinkRef.current?.scrollIntoView({
        block: "nearest",
        inline: "center",
      });
    };
    let frame = 0;
    const scheduleActiveLink = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(showActiveLink);
    };

    scheduleActiveLink();
    const observer = new ResizeObserver(scheduleActiveLink);
    if (settingsNavRef.current) observer.observe(settingsNavRef.current);
    window.addEventListener("resize", scheduleActiveLink);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleActiveLink);
    };
  }, [pathname]);

  return (
    <div {...stylex.props(styles.shell)}>
      <nav
        ref={settingsNavRef}
        aria-label="Settings"
        {...stylex.props(styles.nav)}
      >
        <Link
          href={mailFolderHref("inbox", undefined, account.id)}
          {...stylex.props(styles.navLink, styles.back)}
        >
          <span {...stylex.props(styles.navIcon)}>
            <Icons.previous size={15} />
          </span>
          Mail
        </Link>
        {mailSettingsSectionIds.map((section) => {
          const href = mailSettingsHref(section);
          const active = pathname === href;
          const Icon = sectionIcons[section];
          return (
            <Link
              key={section}
              ref={active ? activeLinkRef : undefined}
              href={href}
              aria-current={active ? "page" : undefined}
              {...stylex.props(styles.navLink, active && styles.navLinkActive)}
            >
              <span {...stylex.props(styles.navIcon)}>
                <Icon size={15} />
              </span>
              {labels[section]}
            </Link>
          );
        })}
      </nav>
      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.contentInner)}>{children}</div>
      </div>
    </div>
  );
}
