"use client";

import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import * as XLSX from "xlsx";
import { Icons } from "@/components/ui/icons";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import type { Attachment } from "@/lib/mail/types";

const SHEET_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/xlsx",
  "application/xls",
]);

const SHEET_EXTENSIONS = /\.(csv|tsv|xlsx|xls|ods)$/i;

const styles = stylex.create({
  container: {
    width: "82vw",
    maxHeight: "calc(100vh - 170px)",
    overflow: "auto",
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    boxShadow: elevation.overlay,
  },
  sheetTabs: {
    display: "flex",
    gap: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    paddingInline: space[3],
    backgroundColor: colors.surface,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  sheetTab: {
    padding: `${space[2]} ${space[3]}`,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
    color: colors.textFaint,
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    backgroundColor: "transparent",
    cursor: "pointer",
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "color, border-color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
  },
  sheetTabActive: {
    color: colors.text,
    borderBottomColor: colors.text,
  },
  tableWrap: {
    overflow: "auto",
    maxHeight: "calc(100vh - 120px)",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontVariantNumeric: "tabular-nums",
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: `${space[1]} ${space[2]}`,
    textAlign: "start",
    fontWeight: 600,
    color: colors.text,
    backgroundColor: colors.surfaceActive,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    whiteSpace: "nowrap",
  },
  td: {
    padding: `${space[1]} ${space[2]}`,
    color: colors.textMuted,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    whiteSpace: "nowrap",
    maxWidth: 300,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  trLast: {
    borderBottomWidth: 0,
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    padding: space[7],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  error: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space[3],
    padding: space[7],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  sheetLabel: {
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    color: colors.textFaint,
    padding: `${space[2]} ${space[3]}`,
  },
});

export function isSpreadsheet(mimeType: string, filename?: string) {
  if (SHEET_TYPES.has(mimeType)) return true;
  if (filename && SHEET_EXTENSIONS.test(filename)) return true;
  if (mimeType.startsWith("text/") && filename && /\.(csv|tsv)$/i.test(filename)) return true;
  return false;
}

type SheetData = {
  name: string;
  rows: string[][];
};

async function fetchAndParse(attachment: Attachment, accountId: string): Promise<SheetData[]> {
  const href = `/api/mail/attachments/${encodeURIComponent(attachment.id)}?account=${encodeURIComponent(accountId)}&filename=${encodeURIComponent(attachment.filename)}`;
  const res = await fetch(href);
  if (!res.ok) throw new Error("Failed to load file.");

  const contentType = res.headers.get("content-type") ?? "";
  const isCsv =
    contentType.includes("text/csv") ||
    contentType.includes("text/plain") ||
    /\.(csv|tsv)$/i.test(attachment.filename);

  if (isCsv) {
    const text = await res.text();
    const workbook = XLSX.read(text, { type: "string", raw: true });
    return workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], {
        header: 1,
        defval: "",
        blankrows: false,
      }) as string[][],
    }));
  }

  const buf = await res.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], {
      header: 1,
      defval: "",
      blankrows: false,
    }) as string[][],
  }));
}

export function SpreadsheetPreview({
  attachment,
  accountId,
}: {
  attachment: Attachment;
  accountId: string;
}) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setError(null);
    setActive(0);
    fetchAndParse(attachment, accountId)
      .then((data) => {
        if (!cancelled) setSheets(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [attachment, accountId]);

  if (error) {
    return (
      <div {...stylex.props(styles.error)}>
        <Icons.close size={24} />
        <span>{error}</span>
      </div>
    );
  }

  if (!sheets) {
    return (
      <div {...stylex.props(styles.loading)}>
        <Icons.refresh size={16} />
        Loading spreadsheet...
      </div>
    );
  }

  const sheet = sheets[active];
  if (!sheet || sheet.rows.length === 0) {
    return (
      <div {...stylex.props(styles.error)}>
        <span>This spreadsheet is empty.</span>
      </div>
    );
  }

  const header = sheet.rows[0];
  const body = sheet.rows.slice(1);

  return (
    <div {...stylex.props(styles.container)}>
      {sheets.length > 1 ? (
        <div {...stylex.props(styles.sheetTabs)}>
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActive(i)}
              {...stylex.props(styles.sheetTab, i === active && styles.sheetTabActive)}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : (
        <div {...stylex.props(styles.sheetLabel)}>
          {sheet.name}
        </div>
      )}
      <div {...stylex.props(styles.tableWrap)}>
        <table {...stylex.props(styles.table)}>
          <thead>
            <tr>
              {header.map((cell, ci) => (
                <th key={ci} {...stylex.props(styles.th)}>
                  {String(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>
                {header.map((_, ci) => (
                  <td
                    key={ci}
                    {...stylex.props(styles.td, ri === body.length - 1 && styles.trLast)}
                    title={String(row[ci] ?? "")}
                  >
                    {String(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
