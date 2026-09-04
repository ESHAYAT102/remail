<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Interface skills

When changing UI, copy, layout, color, typography, motion, or accessibility, load and follow the matching skill in `.agents/skills/`. Write every fix in this project's StyleX tokens and existing components.

- Review order: `better-accessibility` → `better-layout` → `better-writing` → `better-typography` → `better-colors` → `better-ui`
- Combined review: `better-interface`
- User-invoked only: `interface-review` (change/PR), `break` (stress-test one component), `variant` (compare alternatives), `explain-interface` (how something was built)

# Project architecture

- Remail is a Next.js 16 email client using React, TypeScript, StyleX, Drizzle, Better Auth, Resend, and Stalwart.
- Sign-in is email and password only. Do not add social or OAuth providers, Gmail mailbox access, or third-party mailbox scopes.
- Hosted sender aliases may use any valid local part on a domain owned by the signed-in user. Keep server-side ownership validation in place.
- Internal `redakt_*` storage keys and persisted database names are compatibility-sensitive. Do not rename them for branding cleanup.
- Keep secrets out of source, logs, diffs, and responses. `BETTER_AUTH_URL` in production must remain `https://mail.eshayat.com`.

# Mail behavior

- Sidebar badges represent unread thread counts, including Inbox and Archived. Optimistic updates must only move badge counts for unread threads.
- The shell refreshes visible mailbox data every three seconds and immediately when the page regains focus or visibility. Preserve client state during refreshes and reconcile optimistic count deltas with fresh server values.
- A user's own addresses include the active mailbox, login identity, domain mailbox, and valid aliases. Use the helpers in `lib/mail/identity.ts`; do not compare one email address case-sensitively to decide whether a message is from "You."
- Replies must preserve the selected From identity. Replying to your own sent message targets the other participants rather than yourself.
- Inbound Resend replies are threaded using normalized `In-Reply-To` and `References` values, with the conservative `Re:` subject-and-participant fallback in `lib/resend/threading.ts`. An inbound reply moves the existing thread to Inbox and makes it unread.
- Keyboard shortcuts must not fire while typing in an input, textarea, select, or contenteditable element. H/L and Left/Right switch workspace tabs.

# Attachments and overlays

- Vercel serverless request bodies are limited to roughly 4.5 MB. Compose attachments use 1 MB chunk uploads through `/api/mail/attachment-uploads`; do not put large attachment payloads back into the send request.
- Keep the raw attachment total at or below 25 MB so Base64 encoding remains under Resend's 40 MB message limit.
- Attachment previews are portalled to `document.body` and must stay above the sidebar, tab rail, composers, dialogs, and other stacking contexts. Preserve outside-click and Escape dismissal, reduced-motion behavior, and opening/closing animations.
- General dialogs use the shared components in `components/ui/dialog.tsx`; confirmation dialogs must remain above compose dialogs.

# Verification and deployment

- Run targeted ESLint for changed files, `npx tsc --noEmit`, relevant `node --test --experimental-strip-types` tests, and `npx next build` for substantial changes.
- Full lint has existing CommonJS configuration errors in `babel.config.js` and `postcss.config.js`; do not treat those unrelated errors as regressions.
- Only commit, push, or deploy when explicitly requested. Before committing, inspect status and diff and stage only intended files; the worktree may contain concurrent user changes.
- Production deploys use `npx vercel --prod --yes` and must alias successfully to `https://mail.eshayat.com`.
