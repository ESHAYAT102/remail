import assert from "node:assert/strict";
import test from "node:test";
import {
  rewriteCidImages,
  sanitizeEmailHtml,
  wrapEmailDocument,
} from "./sanitize.ts";

test("keeps useful email HTML and CSS while removing active content", () => {
  const result = sanitizeEmailHtml(
    `<html><head>
      <meta http-equiv="refresh" content="0;url=https://evil.example">
      <style>
        @import "https://evil.example/theme.css";
        .light-logo { display: block; }
        .dark-logo { display: none; }
        .unsafe { width: expression(alert(1)); behavior: url(x); }
        @media (prefers-color-scheme: dark) {
          .light-logo { display: none; }
          .dark-logo { display: block; }
        }
      </style>
    </head><body>
      <script>alert(1)</script>
      <table width="600" style="background:#111;color:#fff"><tr><td onclick="track()">Hello</td></tr></table>
      <a href="https://example.com" target="_self">Read</a>
      <a href="javascript:alert(1)">Unsafe link</a>
      <img src="http://images.example.com/newsletter.png" onload="track()">
      <p style="background-image:url(j\\61vascript:alert(1));color:red">Safe text</p>
    </body></html>`,
  );

  assert.match(result.html, /<style>/);
  assert.match(result.html, /@media \(prefers-color-scheme: dark\)/);
  assert.match(result.html, /style="background:#111;color:#fff"/);
  assert.match(result.html, /width="600"/);
  assert.match(result.html, /src="https:\/\/images\.example\.com\/newsletter\.png"/);
  assert.match(result.html, /target="_blank"/);
  assert.match(result.html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(result.html, /href="javascript:/i);
  assert.doesNotMatch(result.html, /<script|onclick|onload|http-equiv/i);
  assert.doesNotMatch(result.html, /@import|expression|behavior|javascript/i);
  assert.equal(result.blockedRemoteImages, false);
});

test("wraps one complete email document and applies the selected theme", () => {
  const clean = sanitizeEmailHtml(
    `<html><head><style>.dark-logo{display:none}@media(prefers-color-scheme:dark){.dark-logo{display:block}}</style></head><body style="background:#111"><p>Hello</p></body></html>`,
  );
  const document = wrapEmailDocument(clean.html, true, "dark");

  assert.equal(document.match(/<html/g)?.length, 1);
  assert.equal(document.match(/<head/g)?.length, 1);
  assert.equal(document.match(/<body/g)?.length, 1);
  assert.match(document, /name="color-scheme" content="dark"/);
  assert.match(document, /:root \{ color-scheme: dark; \}/);
  assert.match(document, /img-src https: data: blob:/);
  assert.match(document, /name="referrer" content="no-referrer"/);
  assert.ok(document.indexOf("data-redakt-fallback") < document.indexOf(".dark-logo"));
  assert.match(document, /body style="background:#111"/);
});

test("blocks every remote image source when automatic loading is disabled", () => {
  const result = sanitizeEmailHtml(
    `<style>
      .hero{background-image:url(//images.example.com/hero.png)}
      .retina{background-image:image-set("https://images.example.com/retina.png" 2x)}
      .embedded{background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E")}
    </style>
      <div background="http://images.example.com/background.png" style="background:url('https://images.example.com/card.png')">
        <picture><source srcset="//images.example.com/large.png 2x"><img src="https://images.example.com/pixel.png"></picture>
        <img src="data:image/png;base64,aA==">
        <img src="blob:inline-image">
      </div>`,
    false,
  );

  assert.equal(result.blockedRemoteImages, true);
  assert.doesNotMatch(result.html, /images\.example\.com/);
  assert.match(result.html, /data:image\/png;base64,aA==/);
  assert.match(result.html, /data:image\/svg\+xml/);
  assert.match(result.html, /http:\/\/www\.w3\.org\/2000\/svg/);
  assert.match(result.html, /blob:inline-image/);
  assert.match(wrapEmailDocument(result.html, false), /img-src data: blob:/);
});

test("rewrites CID images in attributes, srcsets, and CSS", () => {
  const rewritten = rewriteCidImages(
    `<img src="cid:logo"><source srcset='cid:logo 1x, cid:retina 2x'><div background="cid:retina" style="background-image:url(cid:logo)"></div>`,
    { logo: "blob:logo", "<retina>": "blob:retina" },
  );

  assert.match(rewritten, /src="blob:logo"/);
  assert.match(rewritten, /srcset='blob:logo 1x, blob:retina 2x'/);
  assert.match(rewritten, /background="blob:retina"/);
  assert.match(rewritten, /url\(blob:logo\)/);
});
