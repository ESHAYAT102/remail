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
