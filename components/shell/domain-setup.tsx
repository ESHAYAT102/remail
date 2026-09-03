"use client";

import { useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import type { DomainSetup } from "@/lib/mail/types";

const styles = stylex.create({
  card: {
    width: "100%",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space[3],
    paddingBlock: space[4],
    paddingInline: space[5],
    "@media (max-width: 640px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: space[4],
      paddingInline: space[4],
    },
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[3],
    paddingBlock: space[4],
    paddingInline: space[5],
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    "@media (max-width: 640px)": { paddingInline: space[4] },
  },
  status: {
    flex: "1 1 240px",
    margin: 0,
    color: colors.danger,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
  },
  content: {
    padding: space[5],
    "@media (max-width: 640px)": { padding: space[4] },
  },
  field: {
    display: "flex",
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    gap: space[1],
  },
  label: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  hint: {
    margin: 0,
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  input: {
    width: "100%",
    height: 36,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingInline: space[3],
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    color: colors.text,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    outline: "none",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, box-shadow",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (max-width: 640px)": { fontSize: "16px" },
  },
});

export function DomainSetupPane({
  domain,
  busy,
  onCreate,
  error,
}: {
  domain: DomainSetup | null;
  busy: boolean;
  onCreate: (name: string) => void;
  error?: string;
}) {
  const [name, setName] = useState("");
  const domainId = useId();
  const domainHintId = `${domainId}-hint`;

  return (
    <div {...stylex.props(styles.card)}>
      {!domain ? (
        <form
          {...stylex.props(styles.form)}
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name.trim());
          }}
        >
          <div {...stylex.props(styles.fields)}>
            <div {...stylex.props(styles.field)}>
              <label htmlFor={domainId} {...stylex.props(styles.label)}>
                Domain
              </label>
              <p id={domainHintId} {...stylex.props(styles.hint)}>
                A domain you manage, such as example.com.
              </p>
              <input
                id={domainId}
                {...stylex.props(styles.input)}
                value={name}
                required
                aria-describedby={domainHintId}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => setName(event.target.value)}
                placeholder="example.com"
              />
            </div>
          </div>
          <footer {...stylex.props(styles.footer)}>
            {error ? (
              <p role="alert" {...stylex.props(styles.status)}>
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={busy || !name.trim()}
            >
              {busy ? "Connecting…" : "Connect domain"}
            </Button>
          </footer>
        </form>
      ) : (
        <div {...stylex.props(styles.content)}>
          <p {...stylex.props(styles.hint)}>
            {domain.name} is connected. Manage its records and delivery settings in Resend.
          </p>
        </div>
      )}
    </div>
  );
}
