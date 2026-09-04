"use client";

import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import { SelectControl, type SelectOption } from "@/components/ui/select";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: space[7],
    "@media (max-width: 640px)": { gap: space[6] },
  },
  heading: { display: "flex", flexDirection: "column", gap: space[2] },
  title: {
    margin: 0,
    color: colors.text,
    fontSize: fonts.displaySize,
    lineHeight: fonts.displayLine,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    outline: "none",
  },
  description: {
    margin: 0,
    color: colors.textMuted,
    fontSize: fonts.bodySize,
    lineHeight: fonts.bodyLine,
    maxWidth: "62ch",
    textWrap: "pretty",
  },
  cardGroup: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
  },
  card: {
    overflow: "hidden",
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: elevation.control,
  },
  cardOverflowVisible: {
    overflow: "visible",
  },
  cardHeader: {
    paddingInline: space[5],
    "@media (max-width: 640px)": { paddingInline: space[4] },
  },
  cardTitle: {
    margin: 0,
    color: colors.text,
    fontSize: fonts.titleSize,
    lineHeight: fonts.titleLine,
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  settingRow: {
    minWidth: 0,
    paddingBlock: space[4],
    paddingInline: space[5],
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
    ":first-child": { borderBlockStartWidth: 0 },
    "@media (max-width: 640px)": {
      paddingInline: space[4],
    },
  },
  field: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
    alignItems: "center",
    gap: space[5],
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
      alignItems: "stretch",
      gap: space[3],
    },
  },
  fieldControl: {
    width: "100%",
    minWidth: 0,
  },
  input: {
    width: "100%",
    minHeight: 36,
    paddingInline: space[3],
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    color: colors.text,
    fontFamily: "inherit",
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    outline: "none",
    ":disabled": { cursor: "not-allowed", opacity: 0.45 },
    "[aria-invalid='true']": {
      outlineWidth: 1,
      outlineStyle: "solid",
      outlineColor: colors.danger,
      outlineOffset: -1,
    },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "background-color, box-shadow, opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (max-width: 640px)": { fontSize: "16px !important" },
  },
  status: {
    flex: 1,
    minHeight: fonts.uiLine,
    margin: 0,
    color: colors.textMuted,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
  },
  error: { color: colors.danger },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space[5],
    "@media (max-width: 520px)": {
      alignItems: "stretch",
      flexDirection: "column",
      gap: space[2],
    },
  },
  rowCopy: { display: "flex", flexDirection: "column", gap: 2, maxWidth: "52ch" },
  rowLabel: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  rowDescription: {
    margin: 0,
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  choice: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(176px, 208px)",
    alignItems: "center",
    gap: space[5],
    "@media (max-width: 520px)": {
      gridTemplateColumns: "1fr",
      gap: space[2],
    },
  },
  selectWrap: { width: "100%", minWidth: 0 },
  genericRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[4],
    "@media (max-width: 520px)": {
      alignItems: "flex-start",
      flexDirection: "column",
    },
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space[3],
    width: "100%",
  },
  checkboxWrap: {
    position: "relative",
    display: "inline-flex",
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  checkbox: {
    appearance: "none",
    width: 24,
    height: 24,
    margin: 0,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceActive,
    backgroundImage: colors.raised,
    boxShadow: elevation.lift,
    cursor: "pointer",
    ":disabled": { cursor: "not-allowed", opacity: 0.45 },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, box-shadow, opacity",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
      ":active:not(:disabled)": { transform: "scale(0.96)" },
    },
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: "var(--color-6)" },
    },
  },
  checkboxChecked: {
    backgroundColor: "var(--color-6)",
    "@media (hover: hover)": {
      ":hover:not(:disabled)": { backgroundColor: "var(--color-6)" },
    },
  },
  checkboxMark: {
    position: "absolute",
    inset: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.accentText,
    opacity: 0,
    pointerEvents: "none",
    transform: "scale(0.25)",
    filter: "blur(4px)",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, opacity, filter",
      transitionDuration: "150ms",
      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  checkboxMarkVisible: {
    opacity: 1,
    transform: "scale(1)",
    filter: "blur(0)",
  },
});

export const settingsControlClass = stylex.props(styles.input);
export const settingsControlStyle = styles.input;
export const settingsFormClass = stylex.props(styles.form);

export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="settings-page-title" {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.heading)}>
        <h1 id="settings-page-title" tabIndex={-1} {...stylex.props(styles.title)}>
          {title}
        </h1>
        <p {...stylex.props(styles.description)}>{description}</p>
      </header>
      {children}
    </section>
  );
}

export function SettingsCard({
  title,
  children,
  overflowVisible = false,
}: {
  title: string;
  children: React.ReactNode;
  overflowVisible?: boolean;
}) {
  return (
    <section {...stylex.props(styles.cardGroup)}>
      <header {...stylex.props(styles.cardHeader)}>
        <h2 {...stylex.props(styles.cardTitle)}>{title}</h2>
      </header>
      <div {...stylex.props(styles.card, overflowVisible && styles.cardOverflowVisible)}>
        {children}
      </div>
    </section>
  );
}

export function SettingsField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.settingRow, styles.field)}>
      <div {...stylex.props(styles.rowCopy)}>
        <label htmlFor={htmlFor} {...stylex.props(styles.rowLabel)}>{label}</label>
        {hint ? <p {...stylex.props(styles.rowDescription)}>{hint}</p> : null}
      </div>
      <div {...stylex.props(styles.fieldControl)}>{children}</div>
    </div>
  );
}

export function SettingsRow({ children }: { children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.settingRow, styles.genericRow)}>{children}</div>
  );
}

export function SettingsActionRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.settingRow, styles.genericRow)}>
      <div {...stylex.props(styles.rowCopy)}>
        <div {...stylex.props(styles.rowLabel)}>{label}</div>
        <p {...stylex.props(styles.rowDescription)}>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsActions({ children }: { children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.settingRow, styles.actionsRow)}>{children}</div>
  );
}

export function SettingsStatus({
  id,
  message,
  error = false,
}: {
  id?: string;
  message: string;
  error?: boolean;
}) {
  return (
    <p
      id={id}
      role={error ? "alert" : "status"}
      aria-live="polite"
      {...stylex.props(styles.status, error && styles.error)}
    >
      {message || "\u00a0"}
    </p>
  );
}

export function ToggleSetting({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div {...stylex.props(styles.settingRow, styles.row)}>
      <div {...stylex.props(styles.rowCopy)}>
        <label htmlFor={id} {...stylex.props(styles.rowLabel)}>{label}</label>
        <p id={`${id}-description`} {...stylex.props(styles.rowDescription)}>
          {description}
        </p>
      </div>
      <SettingsCheckbox
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-description`}
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function ChoiceSetting({
  id,
  label,
  description,
  value,
  disabled,
  onChange,
  options,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
}) {
  return (
    <div {...stylex.props(styles.settingRow, styles.choice)}>
      <div {...stylex.props(styles.rowCopy)}>
        <label htmlFor={id} {...stylex.props(styles.rowLabel)}>{label}</label>
        <p id={`${id}-description`} {...stylex.props(styles.rowDescription)}>
          {description}
        </p>
      </div>
      <div {...stylex.props(styles.selectWrap)}>
        <SelectControl
          id={id}
          value={value}
          options={options}
          disabled={disabled}
          describedBy={`${id}-description`}
          onValueChange={onChange}
        />
      </div>
    </div>
  );
}

export function SettingsCheckbox({
  checked,
  onCheckedChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <span {...stylex.props(styles.checkboxWrap)}>
      <input
        {...props}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...stylex.props(styles.checkbox, checked && styles.checkboxChecked)}
      />
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.checkboxMark,
          checked && styles.checkboxMarkVisible,
        )}
      >
        <Icons.tick size={13} strokeWidth={2} />
      </span>
    </span>
  );
}
