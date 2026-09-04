"use client";

import { useEffect, useRef, useState } from "react";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { colors, fonts } from "@/theme/tokens.stylex";

export type RichTextValue = {
  text: string;
  html?: string;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    width: "100%",
  },
  compactRoot: {
    minHeight: 72,
  },
  expandedRoot: {
    flex: 1,
  },
  editorWrap: {
    position: "relative",
    display: "block",
    minHeight: 0,
    flex: 1,
  },
  editor: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    minHeight: 72,
    maxHeight: 280,
    overflowY: "auto",
    color: colors.text,
    caretColor: colors.accent,
    fontFamily: "inherit",
    fontSize: fonts.bodySize,
    lineHeight: fonts.bodyLine,
    overflowWrap: "break-word",
    outline: "none",
    "@media (max-width: 640px)": {
      fontSize: "16px",
    },
  },
  editorExpanded: {
    minHeight: "100%",
    maxHeight: "none",
  },
  paragraph: {
    minHeight: "1.55em",
    margin: 0,
  },
  placeholder: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    color: colors.textFaint,
    fontSize: fonts.bodySize,
    lineHeight: fonts.bodyLine,
    fontWeight: 450,
    pointerEvents: "none",
    "@media (max-width: 640px)": {
      fontSize: "16px",
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  toolbarButtonOn: {
    color: colors.text,
    backgroundColor: colors.surfaceActive,
  },
});

const paragraphClassName = stylex.props(styles.paragraph).className;

function initialEditorState(initialText: string, initialHtml?: string) {
  return (editor: LexicalEditor) => {
    const root = $getRoot();
    if (initialHtml) {
      const document = new DOMParser().parseFromString(initialHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, document);
      if (nodes.length > 0) {
        root.append(...nodes);
        return;
      }
    }
    const lines = initialText.split("\n");
    for (const line of lines) {
      const paragraph = $createParagraphNode();
      if (line) paragraph.append($createTextNode(line));
      root.append(paragraph);
    }
  };
}

function SerializePlugin({ onChange }: { onChange: (value: RichTextValue) => void }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState, editor) => {
        const value = editorState.read(
          () => {
            const root = $getRoot();
            const text = root
              .getChildren()
              .map((node) => node.getTextContent())
              .join("\n");
            const body = $generateHtmlFromNodes(editor);
            return {
              text,
              html: text.trim() ? `<div class="redakt-composer">${body}</div>` : undefined,
            };
          },
          { editor },
        );
        onChangeRef.current(value);
      }}
    />
  );
}

const formats: Array<{
  format: TextFormatType;
  label: string;
  shortcut: string;
  ariaShortcut: string;
  icon: keyof Pick<typeof Icons, "bold" | "italic" | "underline" | "strikethrough">;
}> = [
  {
    format: "bold",
    label: "Bold",
    shortcut: "⌘B",
    ariaShortcut: "Control+B Meta+B",
    icon: "bold",
  },
  {
    format: "italic",
    label: "Italic",
    shortcut: "⌘I",
    ariaShortcut: "Control+I Meta+I",
    icon: "italic",
  },
  {
    format: "underline",
    label: "Underline",
    shortcut: "⌘U",
    ariaShortcut: "Control+U Meta+U",
    icon: "underline",
  },
  {
    format: "strikethrough",
    label: "Strikethrough",
    shortcut: "⌘⇧S",
    ariaShortcut: "Control+Shift+S Meta+Shift+S",
    icon: "strikethrough",
  },
];

export function RichTextToolbar() {
  const [editor] = useLexicalComposerContext();
  const [active, setActive] = useState<Partial<Record<TextFormatType, boolean>>>({});

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(
          () => {
            const selection = $getSelection();
            setActive(
              $isRangeSelection(selection)
                ? Object.fromEntries(
                    formats.map(({ format }) => [format, selection.hasFormat(format)]),
                  )
                : {},
            );
          },
          { editor },
        );
      }),
    [editor],
  );

  return (
    <div role="group" aria-label="Text formatting" {...stylex.props(styles.toolbar)}>
      {formats.map(({ format, icon, label, shortcut, ariaShortcut }) => {
        const FormatIcon = Icons[icon];
        const styled = stylex.props(active[format] && styles.toolbarButtonOn);
        return (
          <IconButton
            key={format}
            type="button"
            aria-label={label}
            aria-pressed={Boolean(active[format])}
            aria-keyshortcuts={ariaShortcut}
            title={`${label} (${shortcut})`}
            className={styled.className}
            style={styled.style}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
          >
            <FormatIcon size={15} />
          </IconButton>
        );
      })}
    </div>
  );
}

export function RichTextComposer({
  initialText,
  initialHtml,
  onChange,
  children,
}: {
  initialText: string;
  initialHtml?: string;
  onChange: (value: RichTextValue) => void;
  children: React.ReactNode;
}) {
  const [initialConfig] = useState<InitialConfigType>(() => ({
    namespace: "redakt-composer",
    theme: { paragraph: paragraphClassName },
    editorState: initialEditorState(initialText, initialHtml),
    onError(error) {
      throw error;
    },
  }));

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {children}
      <HistoryPlugin />
      <SerializePlugin onChange={onChange} />
    </LexicalComposer>
  );
}

export function RichTextEditor({
  placeholder,
  expanded = false,
  autoFocus = false,
  autoFocusSelection = "rootEnd",
  suppressFocusRing = false,
  tabIndex,
  onEscape,
  onSubmit,
}: {
  placeholder: string;
  expanded?: boolean;
  autoFocus?: boolean;
  autoFocusSelection?: "rootStart" | "rootEnd";
  suppressFocusRing?: boolean;
  tabIndex?: number;
  onEscape?: () => void;
  onSubmit?: () => void;
}) {
  return (
    <div
      {...stylex.props(
        styles.root,
        expanded ? styles.expandedRoot : styles.compactRoot,
      )}
    >
      <div {...stylex.props(styles.editorWrap)}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label="Message"
              spellCheck
              tabIndex={tabIndex}
              data-suppress-focus-ring={suppressFocusRing || undefined}
              {...stylex.props(styles.editor, expanded && styles.editorExpanded)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && onEscape) {
                  event.stopPropagation();
                  onEscape();
                  return;
                }
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && onSubmit) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
            />
          }
          placeholder={<div {...stylex.props(styles.placeholder)}>{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      {autoFocus ? <AutoFocusPlugin defaultSelection={autoFocusSelection} /> : null}
    </div>
  );
}
