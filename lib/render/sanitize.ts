import DOMPurify from "isomorphic-dompurify";
import type { ThemePreference } from "@/lib/preferences";

const FORBID_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "base",
  "link",
  "meta",
];

const RESOURCE_ATTRIBUTES = ["src", "srcset", "poster", "background"] as const;
// DOMPurify's safe schemes plus blob: for object URLs created from trusted CID
// attachment bytes. Unknown and executable protocols remain excluded.
const ALLOWED_URI =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
const CSS_URL = /url\(\s*(?:(['"])([\s\S]*?)\1|([^)]*?))\s*\)/gi;
const CSS_IMPORT =
  /@import\s+(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;]*;?/gi;
const CSS_REMOTE_STRING = /(['"])((?:https?:)?\/\/[^'"]+)\1/gi;
const UNSAFE_CSS_DECLARATION =
  /(^|[;{])\s*(?:(?:behavior|-moz-binding)\s*:[^;{}]*|[-\w]+\s*:[^;{}]*expression\s*\([^;{}]*)(?=;|}|$)/gi;

function decodeCssEscapes(value: string) {
  return value
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/\\([^\r\n])/g, "$1");
}

function normalizedRemoteUrl(value: string) {
  const trimmed = value.trim();
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice(7)}`;
  return trimmed;
}

function isHttpsUrl(value: string) {
  return /^https:\/\//i.test(value);
}

function sanitizeRemoteCssStrings(
  css: string,
  allowRemoteImages: boolean,
  onBlockedRemoteImage: () => void,
) {
  const replaceInSegment = (segment: string) =>
    segment.replace(
      CSS_REMOTE_STRING,
      (_match, quote: string, url: string) => {
        const normalized = normalizedRemoteUrl(url);
        if (!allowRemoteImages) {
          onBlockedRemoteImage();
          return `${quote}${quote}`;
        }
        return `${quote}${normalized}${quote}`;
      },
    );
  const urlPattern = new RegExp(CSS_URL.source, CSS_URL.flags);
  let cursor = 0;
  let output = "";
  for (const match of css.matchAll(urlPattern)) {
    const index = match.index ?? cursor;
    output += replaceInSegment(css.slice(cursor, index));
    output += match[0];
    cursor = index + match[0].length;
  }
  return output + replaceInSegment(css.slice(cursor));
}

function sanitizeCss(
  css: string,
  allowRemoteImages: boolean,
  onBlockedRemoteImage: () => void,
) {
  const sanitizedUrls = css
    .replace(CSS_IMPORT, "")
    .replace(UNSAFE_CSS_DECLARATION, "$1")
    .replace(
      CSS_URL,
      (
        _match,
        _quote: string | undefined,
        quoted: string | undefined,
        bare: string | undefined,
      ) => {
        const original = (quoted ?? bare ?? "").trim();
        const decoded = decodeCssEscapes(original)
          .replace(/[\u0000-\u0020\u007f]+/g, "")
          .toLowerCase();

        if (decoded.startsWith("javascript:") || decoded.startsWith("vbscript:")) {
          return 'url("")';
        }

        const normalized = normalizedRemoteUrl(original);
        if (
          !allowRemoteImages &&
          isHttpsUrl(normalizedRemoteUrl(decoded))
        ) {
          onBlockedRemoteImage();
          return 'url("")';
        }

        return `url(${JSON.stringify(normalized)})`;
      },
    );
  return sanitizeRemoteCssStrings(
    sanitizedUrls,
    allowRemoteImages,
    onBlockedRemoteImage,
  );
}

function sanitizeResourceAttributes(
  root: HTMLHtmlElement,
  allowRemoteImages: boolean,
  onBlockedRemoteImage: () => void,
) {
  for (const element of root.querySelectorAll<HTMLElement>(
    RESOURCE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(","),
  )) {
    for (const attribute of RESOURCE_ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (!value) continue;

      // A srcset is a list rather than one URL. Normalizing its two remote URL
      // forms as text is safer than splitting on commas, which also occur in
      // data URLs.
      const normalized = value
        .replace(/(^|[\s,])\/\//g, "$1https://")
        .replace(/(^|[\s,])http:\/\//gi, "$1https://");
      if (!allowRemoteImages && /(^|[\s,])https:\/\//i.test(normalized)) {
        element.removeAttribute(attribute);
        onBlockedRemoteImage();
        continue;
      }
      element.setAttribute(attribute, normalized);
    }
  }
}

/**
 * Keep the HTML and CSS that give real email its layout while removing active
 * content and resource loads the mailbox owner has not approved.
 */
export function sanitizeEmailHtml(html: string, allowRemoteImages = true) {
  const root = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    FORBID_TAGS,
    ADD_TAGS: ["style"],
    ADD_ATTR: ["target", "rel"],
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  }) as HTMLHtmlElement;
  let blockedRemoteImages = false;
  const markBlocked = () => {
    blockedRemoteImages = true;
  };

  sanitizeResourceAttributes(root, allowRemoteImages, markBlocked);

  for (const element of root.querySelectorAll<HTMLElement>("[style]")) {
    const style = element.getAttribute("style");
    if (style) {
      element.setAttribute(
        "style",
        sanitizeCss(style, allowRemoteImages, markBlocked),
      );
    }
  }
  for (const style of root.querySelectorAll("style")) {
    style.textContent = sanitizeCss(
      style.textContent ?? "",
      allowRemoteImages,
      markBlocked,
    );
  }
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    anchor.target = "_blank";
    const rel = new Set(anchor.rel.split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    anchor.rel = [...rel].join(" ");
  }

  return { html: root.outerHTML, blockedRemoteImages };
}

function cidUrl(cid: string, cidMap: Record<string, string>) {
  const key = cid.replace(/^<|>$/g, "");
  return cidMap[key] ?? cidMap[`<${key}>`] ?? "";
}

export function rewriteCidImages(html: string, cidMap: Record<string, string>) {
  return html
    .replace(
      /\b(src|poster|background)=(['"])cid:([^'"]+)\2/gi,
      (_match, attribute: string, quote: string, cid: string) =>
        `${attribute}=${quote}${cidUrl(cid, cidMap)}${quote}`,
    )
    .replace(
      /\bsrcset=(['"])([\s\S]*?)\1/gi,
      (_match, quote: string, value: string) => {
        const rewritten = value.replace(
          /cid:([^\s,]+)/gi,
          (_cidMatch, cid: string) => cidUrl(cid, cidMap),
        );
        return `srcset=${quote}${rewritten}${quote}`;
      },
    )
    .replace(
      /url\(\s*(['"]?)cid:([^)'"\s]+)\1\s*\)/gi,
      (_match, _quote: string, cid: string) =>
        `url(${cidUrl(cid, cidMap)})`,
    );
}

function emailChrome(allowRemoteImages: boolean, theme: ThemePreference) {
  const colorScheme = theme === "system" ? "light dark" : theme;
  const imageSources = allowRemoteImages ? "https: data: blob:" : "data: blob:";
  return `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <meta name="color-scheme" content="${colorScheme}" />
    <meta name="supported-color-schemes" content="light dark" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imageSources}; media-src data: blob:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; object-src 'none';" />
    <style data-redakt-fallback>
      :root { color-scheme: ${colorScheme}; }
      html, body { margin: 0; padding: 0; background: transparent; }
      body {
        /* Flow-root contains first/last block margins so frame measurement does
           not clip the message. Sender CSS remains later in the cascade. */
        display: flow-root;
        color: oklch(0.2 0.003 240);
        font-family: "Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        overflow-wrap: break-word;
        -webkit-text-size-adjust: 100%;
      }
      a {
        color: oklch(0.46 0.18 45);
        text-underline-position: from-font;
        text-decoration-thickness: from-font;
      }
      img { max-width: 100%; height: auto; color: inherit; font: inherit; }
      table { max-width: 100%; }
      pre { max-width: 100%; overflow: auto; }
      blockquote {
        margin: 12px 0;
        padding-inline-start: 12px;
        color: oklch(0.48 0.006 240);
        border-inline-start: 2px solid oklch(0.86 0.003 240);
      }
      .redakt-composer { white-space: pre-wrap; }
      .redakt-composer p { margin: 0; }
      @media (prefers-color-scheme: dark) {
        body { color: oklch(0.96 0.001 240); }
        a { color: oklch(0.76 0.18 45); }
        blockquote {
          color: oklch(0.82 0.004 240);
          border-inline-start-color: oklch(0.42 0.005 240);
        }
      }
    </style>`;
}

export function wrapEmailDocument(
  body: string,
  allowRemoteImages = true,
  theme: ThemePreference = "system",
) {
  const document = /^\s*<html[\s>]/i.test(body)
    ? body
    : `<html><head></head><body>${body}</body></html>`;
  const withHead = /<head[\s>]/i.test(document)
    ? document.replace(
        /<head([^>]*)>/i,
        `<head$1>${emailChrome(allowRemoteImages, theme)}`,
      )
    : document.replace(
        /<html([^>]*)>/i,
        `<html$1><head>${emailChrome(allowRemoteImages, theme)}</head>`,
      );
  return `<!doctype html>\n${withHead}`;
}
