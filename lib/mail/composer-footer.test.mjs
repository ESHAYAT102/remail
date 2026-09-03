import assert from "node:assert/strict";
import test from "node:test";
import {
  addRedaktFooter,
  emptyComposeInput,
  hasAuthoredComposeContent,
  hasAuthoredComposeText,
  REDAKT_FOOTER_TEXT,
} from "./composer-footer.ts";

test("prefills the Redakt footer only when the preference is enabled", () => {
  assert.equal(emptyComposeInput(true).text, `\n\n${REDAKT_FOOTER_TEXT}`);
  assert.equal(emptyComposeInput(false).text, "");
  assert.equal(addRedaktFooter("", true), `\n\n${REDAKT_FOOTER_TEXT}`);
  assert.equal(addRedaktFooter("Reply\n", true), `Reply\n\n${REDAKT_FOOTER_TEXT}`);
  assert.equal(addRedaktFooter("Reply", false), "Reply");
});

test("does not count the default footer as authored message content", () => {
  assert.equal(hasAuthoredComposeText(""), false);
  assert.equal(hasAuthoredComposeText(`\n\n${REDAKT_FOOTER_TEXT}`), false);
  assert.equal(hasAuthoredComposeText(`Hello\n\n${REDAKT_FOOTER_TEXT}`), true);
});

test("recognizes authored HTML when the plain-text mirror is empty", () => {
  assert.equal(
    hasAuthoredComposeContent({ text: "", html: "<p><b>Hello</b></p>" }),
    true,
  );
  assert.equal(
    hasAuthoredComposeContent({
      text: `\n\n${REDAKT_FOOTER_TEXT}`,
      html: `<div><p></p><p>${REDAKT_FOOTER_TEXT}</p></div>`,
    }),
    false,
  );
  assert.equal(
    hasAuthoredComposeContent({ text: "", html: "<p><br></p><style>p{color:red}</style>" }),
    false,
  );
  assert.equal(
    hasAuthoredComposeContent({ text: "", html: '<p><img src="https://example.com/a.png"></p>' }),
    true,
  );
});
