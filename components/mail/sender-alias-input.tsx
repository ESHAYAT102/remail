"use client";

import { useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { settingsControlStyle } from "@/components/settings/settings-ui";
import { fuzzySenderAliases, normalizeSenderAlias } from "@/lib/mail/sender-aliases";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: { position: "relative", width: "100%", minWidth: 0 },
  control: {
    display: "flex",
    alignItems: "stretch",
    width: "100%",
    minHeight: 40,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ":focus-within": {
      borderColor: colors.textMuted,
      outline: "none",
      boxShadow: "none",
    },
    "@media (max-width: 640px)": { minHeight: 44 },
  },
  input: {
    flex: 1,
    minWidth: 80,
    borderWidth: 0,
    paddingBlock: space[2],
    paddingInline: space[3],
    backgroundColor: "transparent",
    color: colors.text,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    outline: "none",
    ":focus-visible": { outline: "none" },
    "::placeholder": { color: colors.textFaint },
    "@media (max-width: 640px)": { fontSize: "16px" },
  },
  inputRaised: { paddingInlineStart: 0 },
  controlRaised: { paddingInlineEnd: 0 },
  domain: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    paddingInline: space[3],
    borderInlineStartWidth: 1,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: colors.line,
    color: colors.textMuted,
    fontSize: fonts.uiSize,
  },
  popup: {
    position: "absolute",
    zIndex: 20,
    insetBlockStart: "calc(100% + 6px)",
    insetInline: 0,
    maxHeight: 240,
    overflowY: "auto",
    padding: space[1],
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    boxShadow: elevation.overlay,
  },
  popupAbove: {
    insetBlockStart: "auto",
    insetBlockEnd: "calc(100% + 6px)",
  },
  option: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    minHeight: 40,
    paddingBlock: space[2],
    paddingInline: space[3],
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    color: colors.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    textAlign: "start",
  },
  activeOption: { backgroundColor: colors.surfaceActive },
  alias: { fontWeight: 550 },
  optionDomain: { color: colors.textFaint },
  empty: {
    margin: 0,
    paddingBlock: space[2],
    paddingInline: space[3],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    minHeight: 36,
  },
  fieldLabel: {
    flexShrink: 0,
    width: 28,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    color: colors.textMuted,
    fontWeight: 500,
  },
});

export function SenderAliasInput({
  id,
  value,
  domain,
  placement = "below",
  disabled,
  raised = false,
  onChange,
  onCommit,
}: {
  id: string;
  value: string;
  domain: string;
  placement?: "above" | "below";
  disabled?: boolean;
  raised?: boolean;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  const generatedId = useId();
  const listId = `${id}-${generatedId}-suggestions`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = fuzzySenderAliases(value);

  const select = (alias: string) => {
    onChange(alias);
    onCommit?.(alias);
    setOpen(false);
  };

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.control, raised && settingsControlStyle, raised && styles.controlRaised)}>
        <input
          id={id}
          data-border-focus=""
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && suggestions[activeIndex]
              ? `${listId}-${suggestions[activeIndex]}`
              : undefined
          }
          value={value}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="hello"
          {...stylex.props(styles.input, raised && styles.inputRaised)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onCommit?.(normalizeSenderAlias(value));
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp" && suggestions.length) {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open && suggestions[activeIndex]) {
              event.preventDefault();
              select(suggestions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <span aria-hidden="true" {...stylex.props(styles.domain)}>@{domain}</span>
      </div>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggested sender aliases"
          {...stylex.props(
            styles.popup,
            placement === "above" && styles.popupAbove,
          )}
        >
          {suggestions.length ? suggestions.map((alias, index) => (
            <button
              key={alias}
              id={`${listId}-${alias}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              {...stylex.props(styles.option, index === activeIndex && styles.activeOption)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(alias)}
            >
              <span {...stylex.props(styles.alias)}>{alias}</span>
              <span {...stylex.props(styles.optionDomain)}>@{domain}</span>
            </button>
          )) : (
            <p {...stylex.props(styles.empty)}>Use “{value}” as the sender alias</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Labeled From row shared by the new-mail and reply composers. */
export function SenderField({
  id,
  value,
  placement,
  raised,
  onChange,
}: {
  id: string;
  value: string;
  placement?: "above" | "below";
  raised?: boolean;
  onChange: (value: string) => void;
}) {
  const separator = value.lastIndexOf("@");
  const domain = separator >= 0 ? value.slice(separator + 1) : "";
  const localPart = separator >= 0 ? value.slice(0, separator) : value;

  return (
    <div {...stylex.props(styles.fieldRow)}>
      <label htmlFor={id} {...stylex.props(styles.fieldLabel)}>
        From
      </label>
      <SenderAliasInput
        id={id}
        value={localPart}
        domain={domain}
        placement={placement}
        raised={raised}
        onChange={(alias) => onChange(`${alias}@${domain}`)}
      />
    </div>
  );
}
