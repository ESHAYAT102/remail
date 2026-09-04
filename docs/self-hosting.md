# Self-hosting

## Recommendation

Split the product from the MX. Same shape for Redakt Cloud and for people who self-host.

```
  users  →  Redakt + Postgres     (easy host)
                │
                └── Stalwart      (VPS with port 25 + PTR)
```

Internet mail only works where SMTP **25** and a matching **PTR** exist. Vercel, Railway, Fly, and Render do not give you that. An HTTP tunnel does not either.

### Hosted Redakt (what we run)

| Piece | Where | Why |
| --- | --- | --- |
| Redakt | [Railway](https://railway.com) | Git deploys, previews, private DNS to Postgres. Not the MX. |
| Postgres | Railway plugin (or Neon) | Managed backups. Same project as the app. |
| Stalwart | A **mail VPS** we own | Optional self-hosted mail engine. Pin `stalwartlabs/stalwart:v0.16`. |

Customer domains MX to **our** host, e.g. `mail.redakt.app` → that VPS. One IPv4, warm it slowly (SPF / DKIM / DMARC first, low volume). Do not put Stalwart on Railway or Vercel.

**Mail VPS:** [OVHcloud VPS](https://www.ovhcloud.com/) or [Hetzner dedicated](https://www.hetzner.com/dedicated-rootserver). PTR is configured in the provider panel. Current OVHcloud guidance says outbound port 25 is blocked by default, so request the unblock and verify both inbound and outbound SMTP before publishing MX. [Hetzner Cloud](https://www.hetzner.com/cloud) also restricts port 25 on new accounts. Skip AWS, GCP, Azure, and DigitalOcean for the MX.

Optional later: Coolify on a second box if we want the app off Railway. The mail VPS stays dedicated.

### Self-host (what we tell people)

**Default:** one mail-friendly VPS + [Coolify](https://coolify.io) + this repo’s Compose file.

Coolify matches our stack: Git deploy, Let’s Encrypt, native Docker Compose. Give the box **4 GB RAM**. Publish 25 / 465 / 993 on the host; do not HTTP-proxy those ports.

| If you… | Use |
| --- | --- |
| Want the easy path | Coolify on OVH VPS or Hetzner dedicated |
| Hate extra dashboards | `docker compose up` on that same VPS |
| Want SSH / no agent on the box | [Openship](https://openship.io) |
| Have a 1–2 GB VPS | [Dokploy](https://dokploy.com) or raw compose |
| Only want the UI | Vercel, `DEMO_MODE=true` |
| Want account management only | Railway for all three (no public MX) |

Openship’s bundled mail is transactional (often an SES/SMTP relay). That is **not** a substitute for Stalwart. Still run our Stalwart service. Still publish MX to the VPS.

**Do not** put the MX on Vercel, Railway TCP proxy, or Cloudflare Tunnel.

### Which VPS

| Provider | Port 25 | Notes |
| --- | --- | --- |
| OVHcloud VPS | Unblock request | Good default after inbound and outbound port 25 are verified |
| Hetzner dedicated | Open | Best for a long-lived dedicated IP |
| Hetzner Cloud | Blocked ~30 days | Ticket after first invoice |
| Contabo | Open | Cheap; watch IP reputation |
| DigitalOcean, Vultr | Ticket | Slow and often refused |
| AWS, GCP, Azure | Effectively no | Do not use for MX |

---

## Environment

Generate a long `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Never commit production secrets.

| Variable | Notes |
| --- | --- |
| `DEMO_MODE` | `true` for fixture mail. `false` for Postgres + Stalwart. |
| `BETTER_AUTH_SECRET` | Required when live. |
| `BETTER_AUTH_URL` | Public origin of the app, e.g. `https://app.example.com`. |
| `DATABASE_URL` | Postgres URL. |
| `STALWART_URL` | JMAP base. Private hostname on the same box, or `https://mail.…` if Stalwart is elsewhere. |
| `STALWART_ADMIN_USER` | Admin from the Stalwart wizard. |
| `STALWART_ADMIN_SECRET` | That admin’s password. |
| `MAIL_HOSTNAME` | Public MX host, e.g. `mail.example.com`. Not a tunnel URL. |

Generate migrations with `pnpm db:generate` and commit the generated SQL and
metadata. The production Docker image runs `node scripts/migrate.mjs` before
application startup; it uses `pg` and does not require exposing Postgres to the
public internet.

First-boot wizard: [deploy/stalwart/README.md](../deploy/stalwart/README.md).

---

## Coolify (recommended self-host)

1. Buy an OVH VPS or Hetzner dedicated. Set PTR to `mail.yourdomain.com`; request any SMTP unblock and verify inbound and outbound port 25.
2. Install [Coolify](https://coolify.io) (4 GB RAM class).
3. New project → this Git repo or `docker-compose.yml`.
4. Set the env vars above. Pin Stalwart to `stalwartlabs/stalwart:v0.16`.
5. Publish `25` / `465` / `993` on the **host** for Stalwart. Traefik/Caddy only for HTTP(S).
6. Apply the versioned migrations. Finish the Stalwart wizard. Publish MX / SPF / DKIM / DMARC.

## Openship

Control plane on your laptop or `openship up` on a box. Builds stream over SSH.

Deploy this repo / compose. Ignore Openship’s bundled transactional mail. Run Stalwart. MX still hits port 25 on the VPS.

## Railway (app only)

[Railway](https://railway.com) is right for **our** Redakt + Postgres. It can also run Stalwart for JMAP, but its [TCP proxy](https://docs.railway.com/networking/tcp-proxy) is a random high port — not a usable MX.

```bash
railway up
railway add --database postgres --json
```

```
DEMO_MODE=false
BETTER_AUTH_URL=https://<app-domain>
DATABASE_URL=${{Postgres.DATABASE_URL}}
STALWART_URL=http://stalwart.railway.internal:8080
MAIL_HOSTNAME=mail.yourdomain.com
```

Point `STALWART_URL` at the mail VPS (`https://mail.yourdomain.com`) when you want real internet mail.

## Vercel (UI only)

Import the repo, `DEMO_MODE=true`. Fixture mail only.

Live UI: same env as above, Postgres elsewhere, `STALWART_URL=https://mail.yourdomain.com`. Vercel cannot run Stalwart.

## Raw compose

```bash
cp .env.example .env
# DEMO_MODE=false, secrets, MAIL_HOSTNAME=mail.yourdomain.com
docker compose up --build -d
pnpm db:push
```

Publish `25`, `465`, `993`, and HTTPS. Pin Stalwart to `v0.16`. Remove `STALWART_RECOVERY_ADMIN` after HTTPS admin works.

---

## After it is up

- Create an account, add the domain, publish DNS. The checker uses public DoH.
- Do not leave `admin` / `changeme` on a public Stalwart.
- Stalwart is AGPL. Running the image does not change this repo’s license.
