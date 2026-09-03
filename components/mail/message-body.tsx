"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { colors, fonts, space } from "@/theme/tokens.stylex";
import {
  rewriteCidImages,
  sanitizeEmailHtml,
  wrapEmailDocument,
} from "@/lib/render/sanitize";
import type { Attachment } from "@/lib/mail/types";
import type { ThemePreference } from "@/lib/preferences";

const styles = stylex.create({
  frame: {
    width: "100%",
    borderWidth: 0,
    display: "block",
    backgroundColor: "transparent",
  },
  text: {
    fontSize: fonts.readingSize,
    lineHeight: fonts.readingLine,
    color: colors.text,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    maxWidth: "68ch",
  },
  blocked: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space[2],
    marginBlockEnd: space[3],
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
});

export function MessageBody({
  html,
  text,
  attachments,
  label,
  labelledBy,
  loadRemoteImages = true,
  theme = "system",
}: {
  html?: string;
  text?: string;
  attachments: Attachment[];
  /** Names the frame so it is not just "Email body" repeated down the thread. */
  label?: string;
  /** Id of the sender heading, so the frame carries its speaker's name. */
  labelledBy?: string;
  loadRemoteImages?: boolean;
  theme?: ThemePreference;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const [loadOnce, setLoadOnce] = useState(false);
  const [cidMap, setCidMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const map: Record<string, string> = {};
    const urls: string[] = [];
    for (const attachment of attachments) {
      if (!attachment.contentId || !attachment.content) continue;
      const blob = new Blob([attachment.content as BlobPart], {
        type: attachment.mimeType,
      });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      map[attachment.contentId] = url;
    }
    queueMicrotask(() => {
      if (active) setCidMap(map);
    });
    return () => {
      active = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [attachments]);

  const rendered = useMemo(() => {
    if (!html) return { srcDoc: "", blockedRemoteImages: false };
    const withCid = rewriteCidImages(html, cidMap);
    const allowRemoteImages = loadRemoteImages || loadOnce;
    const clean = sanitizeEmailHtml(withCid, allowRemoteImages);
    return {
      srcDoc: wrapEmailDocument(clean.html, allowRemoteImages, theme),
      blockedRemoteImages: clean.blockedRemoteImages,
    };
  }, [cidMap, html, loadOnce, loadRemoteImages, theme]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const inner = new ResizeObserver(fit);
    let observing = false;

    function fit() {
      const doc = frame?.contentDocument;
      if (!doc?.body) return;
      // Take the taller of the two: body can under-report when a child's margin
      // escapes it, and the root can over-report once the frame has been sized.
      setHeight(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight));
      if (!observing) {
        inner.observe(doc.body);
        observing = true;
      }
    }

    // The inner observer cannot see a reflow caused by the frame getting
    // narrower, because the frame's own height is what it is watching. Watch
    // the width from this side and re-measure, ignoring our own height writes.
    let lastWidth = frame.clientWidth;
    const outer = new ResizeObserver(() => {
      if (frame.clientWidth === lastWidth) return;
      lastWidth = frame.clientWidth;
      fit();
    });
    outer.observe(frame);

    frame.addEventListener("load", fit);
    const t = window.setTimeout(fit, 50);
    // Late web fonts and decoded images both reflow the body after load.
    void frame.contentDocument?.fonts?.ready.then(fit).catch(() => {});
    return () => {
      frame.removeEventListener("load", fit);
      inner.disconnect();
      outer.disconnect();
      window.clearTimeout(t);
    };
  }, [rendered.srcDoc]);

  if (!html && text) {
    return <div {...stylex.props(styles.text)}>{text}</div>;
  }

  if (!html) return null;

  return (
    <>
      {rendered.blockedRemoteImages ? (
        <div {...stylex.props(styles.blocked)}>
          Remote images are hidden to reduce tracking.
          <Button type="button" variant="ghost" onClick={() => setLoadOnce(true)}>
            Load images
          </Button>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        title={label ?? "Email body"}
        aria-labelledby={labelledBy}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={rendered.srcDoc}
        {...stylex.props(styles.frame)}
        style={{ height, colorScheme: theme === "system" ? "light dark" : theme }}
      />
    </>
  );
}
