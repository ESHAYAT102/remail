# Remail

A design-first, open-source mail client and provider. Host mail on a domain you
own, then read and send from a quiet inbox.

Remail is the product layer: onboarding, DNS, and the inbox.
[Resend](https://resend.com) handles custom-domain sending and receiving.
Inbound messages and attachments are stored in Remail's Postgres database.

The project is early (`0.1.0`). Demo mode is the fastest way to look at the product. Live mode talks to a real mail engine on your machine.

Interface inspiration: [Define](https://define.app) and [Tatem](https://tatem.com).

## Run it

You need [pnpm](https://pnpm.io/) 11 and Node 20+. Live mode also needs Docker.

### Demo

No Postgres, no Stalwart, no port 25.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Demo mode keeps a local session and loads fixture `.eml` files from `fixtures/`. Seed login is `ada@redakt.local` / `demo`.

### Live (Postgres + Resend)

```bash
pnpm install
pnpm dev:live
```

`dev:live` creates `.env` with local defaults and generated auth secrets when it
is missing. If `.env` already exists, it appends only documented settings that
are not present and leaves every existing value untouched. It then starts
Postgres, pushes the schema, and runs the app with `DEMO_MODE=false`. Each user
connects their own Resend API key and webhook signing secret during onboarding.

| Service | Port |
| --- | --- |
| Remail | `3000` |
| Postgres | `5432` |

`docker compose up --build` also runs the app in a container. Prefer `pnpm dev:live` while developing.

### Internet mail

Create a Resend webhook subscribed to `email.received` at
`https://your-app.example/api/webhooks/resend`. Domain setup enables both Resend
sending and receiving. Every local part at an owned domain is routed into the
same hosted inbox, so `hello@eshayat.com`, `anything@eshayat.com`, and other
addresses are accepted without creating individual mailboxes.

To put this on Vercel, Railway, Coolify, Openship, or a VPS, see [docs/self-hosting.md](docs/self-hosting.md).

## How it fits together

```
  browser  →  account-scoped Next.js routes + mail contract
                                      │
                          Remail hosted adapter
                         Resend + local mailbox
                                      │
                                  Postgres
```

`getMailProvider(user, accountId)` in `lib/mail/get-provider.ts` resolves a
hosted `MailAccount` and returns the shared `MailProvider` contract.

Mail views have canonical, refresh-safe URLs. Authenticated route data is loaded
on the server; navigation, search controls, pagination, compose, and the
persistent tab rail enhance those pages on the client.

| Route | View |
| --- | --- |
| `/mail/a/:accountId/:folder` | Account-scoped inbox, unread, starred, sent, drafts, spam, trash, or archive |
| `/mail/a/:accountId/:folder/thread/:threadId` | Account-scoped conversation in its originating folder context |
| `/mail/settings/accounts` | Connected mailboxes, privacy, and account lifecycle |
| `/mail/settings/domain` | Domain and DNS setup |

Folder query state such as search, filters, and sort order is encoded in the
URL, so a copied link and a full reload render the same result.

| Path | Role |
| --- | --- |
| `app/` | App Router pages and API routes |
| `components/shell/` | Login, onboarding, inbox chrome |
| `components/mail/` | Thread list and reader |
| `components/ui/` | Shared controls (StyleX + Base UI) |
| `lib/mail/` | Provider types and routing |
| `lib/google/` | Optional Google identity sign-in configuration |
| `lib/demo/` | Demo store and fixture provider |
| `lib/resend/` | Resend transport and hosted mailbox provider |
| `theme/` | StyleX tokens |
| `fixtures/` | Sample `.eml` files for demo |
| `deploy/stalwart/` | Stalwart notes and future production config |
| `docs/self-hosting.md` | Vercel, Railway, Coolify, Openship, VPS |

## Environment

Copy `.env.example` to `.env`. Do not commit `.env`.

| Variable | Demo | Live |
| --- | --- | --- |
| `DEMO_MODE` | `true` (default) | `false` (`pnpm dev:live` sets this) |
| `BETTER_AUTH_SECRET` | unused | required |
| `BETTER_AUTH_SECRETS` | unused | versioned encryption keys, current first |
| `BETTER_AUTH_URL` | unused | `http://localhost:3000` |
| `DATABASE_URL` | unused | Postgres URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | unused | optionally enables Google sign-in |

Mailbox passwords are at least 8 characters (Better Auth).

## Keyboard

`⌥N` compose, `j` / `k` move, `⌘W` close tab, `r` reply, `c` compose.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE). Stalwart remains AGPL when you run it.
