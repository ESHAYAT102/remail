import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  shell: "var(--color-8)",
  canvas: "var(--color-9)",
  surface: "var(--color-9)",
  surfaceGlass: "color-mix(in oklch, var(--color-9) 96%, transparent)",
  surfaceHover: "var(--overlay-hover)",
  surfaceActive: "var(--overlay-active)",
  text: "var(--color-1)",
  textMuted: "var(--color-3)",
  textFaint: "var(--color-4)",
  line: "var(--color-7)",
  accent: "var(--accent)",
  accentText: "var(--accent-text)",
  accentOnSolid: "var(--accent-on-solid)",
  accentSoft: "color-mix(in oklch, var(--accent) 22%, var(--color-9))",
  danger: "var(--danger-text)",
  dangerSolid: "var(--danger-solid)",
  dangerSolidHover: "var(--danger-solid-hover)",
  dangerOnSolid: "var(--danger-on-solid)",
  ok: "var(--positive-text)",
  okSoft: "var(--positive-soft)",
  okFlash: "color-mix(in oklch, var(--positive-text) 12%, transparent)",
  input: "var(--color-8)",
  shadow: "var(--shadow-border)",
  shadowHover: "var(--shadow-border-hover)",
  raised: "var(--raised)",
  raisedAccent: "var(--raised-accent)",
});

export const folderPalette = stylex.defineVars({
  neutral: "var(--folder-category-neutral)",
  rose: "var(--folder-category-rose)",
  amber: "var(--folder-category-amber)",
  green: "var(--folder-category-green)",
  blue: "var(--folder-category-blue)",
  violet: "var(--folder-category-violet)",
  backTop: "color-mix(in oklch, currentcolor 72%, white)",
  back: "color-mix(in oklch, currentcolor 64%, var(--color-9))",
  frontTop: "color-mix(in oklch, currentcolor 58%, white)",
  front: "color-mix(in oklch, currentcolor 84%, var(--color-9))",
  badgeInk: "color-mix(in oklch, currentcolor 58%, var(--color-1))",
});

export const elevation = stylex.defineVars({
  control: "var(--elevation-1)",
  panel: "var(--elevation-2)",
  card: "var(--elevation-3)",
  overlay: "var(--elevation-4)",
  lift: "var(--lift)",
  liftAccent: "var(--lift-accent)",
  recommended: "var(--recommended-raised)",
});

export const radius = stylex.defineVars({
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "14px",
  "2xl": "20px",
  "3xl": "24px",
  full: "999px",
});

export const space = stylex.defineVars({
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "32px",
  7: "48px",
});

export const fonts = stylex.defineVars({
  sans: '"Inter Variable", "Inter", "Avenir Next", ui-sans-serif, system-ui, sans-serif',
  microSize: "11px",
  microLine: "1.3",
  microTrack: "0.04em",
  captionSize: "12px",
  captionLine: "1.4",
  captionTrack: "0.01em",
  uiSize: "13px",
  uiLine: "1.45",
  bodySize: "13px",
  bodyLine: "1.55",
  readingSize: "15px",
  readingLine: "1.6",
  titleSize: "15px",
  titleLine: "1.4",
  displaySize: "22px",
  displayLine: "1.2",
});
