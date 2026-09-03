# Contributing

Thanks for wanting to work on Remail. This is an open-source mail provider.

By opening a pull request you agree to license your work under [MIT](LICENSE), the same license as the rest of this repository.

## Before you start

- Read [README.md](README.md) for how to run demo and live mode, and [docs/self-hosting.md](docs/self-hosting.md) for Vercel, Railway, Coolify, Openship, or a VPS.
- Open an issue first if the change is large, changes the mail provider contract, or touches licensing.
- Do not vendor, fork, or copy Stalwart into this repo. Talk to it over JMAP.

## Development

You need [pnpm](https://pnpm.io/) 11 and Node 20+. Live mode also needs Docker.

```bash
cp .env.example .env
pnpm install
pnpm dev          # demo, no Postgres or Stalwart
# or
pnpm dev:live     # Postgres + Stalwart + DEMO_MODE=false
```

Then:

```bash
pnpm lint
```

Live first-boot notes are in [deploy/stalwart/README.md](deploy/stalwart/README.md).

Do not commit `.env`, `.data/`, or Stalwart volumes. Demo data lives in `.data/demo.json` (gitignored).

## How we like changes

Keep the diff to the problem you are solving. Do not drive-by reformat, rename, or “improve” unrelated files.

### Product UI

The inbox should stay quiet. Match existing copy, spacing, and components.

- Style with StyleX tokens in `theme/tokens.stylex.ts` and `app/globals.css`. Do not add a second styling system.
- Reuse `components/ui/` before adding a new primitive.
- Interface work also has skills in `.agents/skills/` (`better-accessibility`, `better-layout`, `better-writing`, `better-typography`, `better-colors`, `better-ui`). Follow those if you are changing UI.

### Mail and APIs

- `MailProvider` in `lib/mail/provider.ts` is the contract. Implement demo changes in `lib/demo/` and live changes in `lib/stalwart/`. Keep both backends in sync when you add a method.
- API routes take the session user and call `getMailProvider(user)`. Do not talk to Stalwart from a React component.
- Passwords for Better Auth sign-up must be at least 8 characters.

### Docs

If you change how someone runs or deploys the app, update README or `deploy/stalwart/README.md` in the same PR.

## Pull requests

1. Branch from `main`.
2. Make the smallest change that solves the issue.
3. Run `pnpm lint`.
4. Open a pull request with:
   - what changed and why
   - how you tested it (demo, live, or both)
   - screenshots for UI changes

One concern per PR is easier to review than a bundle.

## Issues

A good issue says what you expected, what happened, and how to reproduce it. Mention demo vs live, and include the Redakt and Stalwart versions if you can (`pnpm list next`, `docker compose exec stalwart …` / image tag).

Security reports (auth bypass, secret leaks, mail injection) should not be filed as a public issue. Email the maintainers listed on the repository instead.

## Conduct

Be respectful. This project follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License reminder

Remail is MIT. Contributing here does not grant rights to relicense third-party software.
