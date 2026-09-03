# Stalwart

Stalwart is the mail engine. Redakt talks to it over JMAP to create domains, read DNS records, create mailboxes, and send or receive mail.

This directory is reserved for a production config. Locally, `pnpm dev:live` (or `docker compose`) starts the official `stalwartlabs/stalwart` image.

See also [README.md](../../README.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Local first boot

1. Copy `.env.example` to `.env` if you have not already.
2. Run `pnpm dev:live`. That starts Postgres + Stalwart, pushes the schema, and runs the app with `DEMO_MODE=false`.
3. Open [http://localhost:8080/admin](http://localhost:8080/admin).
4. Sign in with `STALWART_ADMIN_USER` / `STALWART_ADMIN_SECRET` from `.env`. The compose defaults are `admin` / `changeme`.

The first start is bootstrap mode. Mail services are not up until you finish the wizard.

### Wizard values that work locally

Keep the defaults except where local TLS or public DNS would fail:

| Step | Field | Local value |
| --- | --- | --- |
| 1 | Server hostname | `mail.redakt.local` |
| 1 | Default email domain | `redakt.local` (Redakt adds real domains later) |
| 1 | Automatically obtain TLS certificate | Off |
| 1 | Generate email signing keys | On |
| 2 | Storage | Leave RocksDB defaults |
| 3 | Directory | Internal directory |
| 4 | Logging | Console |
| 5 | DNS | Manual |

After the last screen, Stalwart writes its config, prints a permanent administrator (`admin@<default-domain>` plus a one-time password), and restarts.

Put that email and password in `.env`:

```
STALWART_ADMIN_USER=admin@redakt.local
STALWART_ADMIN_SECRET=<password from the wizard>
```

Then close the Stalwart tab. You do not need the Stalwart Dashboard. Open [http://localhost:3000](http://localhost:3000) and use Redakt.

The browser dialog that says “Sign in to localhost” is HTTP basic auth on the Stalwart WebUI. It will reject the generated account and prompt again. Cancel it. Redakt talks to Stalwart over JMAP, not that screen.

## How Redakt uses it

| Env | Role |
| --- | --- |
| `STALWART_URL` | JMAP base, default `http://localhost:8080` |
| `STALWART_ADMIN_USER` | Recovery admin used to create domains and mailboxes |
| `STALWART_ADMIN_SECRET` | Recovery admin password |
| `MAIL_HOSTNAME` | MX host shown in the Redakt DNS wizard. Local default is a placeholder (`mail.example.com`). Production must be the public hostname that accepts SMTP, for example `mail.example.org`. An HTTP tunnel is not an MX. |

Onboarding in Redakt creates the domain and the mailbox in Stalwart. You should not create those by hand unless you are debugging the engine.

## After first boot

- Redakt: [http://localhost:3000](http://localhost:3000)
- JMAP: `http://localhost:8080/.well-known/jmap` (follows to `/jmap/session`)
- SMTP `25` / `465`, IMAP `993`

Leave [http://localhost:8080/admin](http://localhost:8080/admin) alone after the wizard. On HTTP it loops on a basic-auth prompt.

To start over, wipe the volume and run `pnpm dev:live` again:

```bash
docker compose down
docker volume rm redakt_stalwart-data
```

## Production

The production files in this directory separate bootstrap from steady state:

```bash
cp stalwart.env.example stalwart.env
# Replace the bootstrap password, then:
docker compose --env-file stalwart.env \
  -f compose.production.yml \
  -f compose.bootstrap.yml up -d
```

Before the wizard, create the DNS-only `mail` address record, set the VPS PTR to
the same hostname, and allow TCP `25`, `443`, `465`, `587`, and `993` through
the host and provider firewalls. Current OVHcloud guidance says outbound port
25 is blocked by default, so request an unblock and test it explicitly.

In the wizard, use the public `MAIL_HOSTNAME`, enable automatic TLS and DKIM,
use the internal directory, and keep DNS management manual. Once the permanent
administrator works at `https://<MAIL_HOSTNAME>/admin`, recreate without the
bootstrap override:

```bash
docker compose --env-file stalwart.env -f compose.production.yml up -d
```

That removes both the public recovery listener on `8080` and
`STALWART_RECOVERY_ADMIN`. Do not keep either in the public steady-state
deployment.

### Production DNS resolver

Before sending mail, open **Settings → Network → DNS → DNS Resolver** in the
Stalwart administration UI. Select **Cloudflare DNS**, keep **Use TLS** enabled,
and save. Then run **Reload: Server settings** followed by **Invalidate caches**
under **Management → Actions**.

Do not leave production on the system resolver. Docker and VPS system resolvers
may not preserve the DNSSEC responses Stalwart needs for DANE delivery. A bogus
DNSSEC result causes standards-compliant mail servers to defer the message
without opening an SMTP connection.

The resolver choice is stored in Stalwart's registry inside the `stalwart-data`
volume. It survives container recreation and is included in the production
volume backups described below. After a restore or first boot on a replacement
host, verify that the resolver still reads **Cloudflare** with TLS enabled before
resuming outbound mail.

Back up both named volumes (`stalwart-etc` and `stalwart-data`) before upgrades
and test restores away from the production host. Pin the `v0.16` release line;
do not switch production to `latest`.

Where to run the app vs the engine: [docs/self-hosting.md](../../docs/self-hosting.md).

### Production updates

Production updates are deliberately separate from application releases. Run
the manual `Stalwart production` Trylle workflow from `main` with `check` to
inspect the current image and health without changing the server. Select
`update` and provide a `stalwartlabs/stalwart:v0.16` or explicit `v0.16.x`
image only when an upgrade has been reviewed.

The restricted CI SSH key can invoke only the root-owned
`/usr/local/sbin/redakt-stalwart-deploy` helper. An update pulls the target and
backup images before downtime, stops Stalwart once, archives both named volumes,
recreates the service, and waits for Docker health. Backups and update metadata
are retained under `/opt/redakt/stalwart/backups/<UTC timestamp>`.

The helper's `stalwart-check` command also fails when Stalwart logged a bogus
DNSSEC result in the previous 15 minutes. Run the workflow's `check` operation
after resolver, networking, or image changes so this delivery failure is visible
even when the container itself remains healthy.

Install `redakt-stalwart-deploy` as `root:root` with mode `0755` and install
`redakt-stalwart-deploy.sudoers` under `/etc/sudoers.d/` with mode `0440`. The
dedicated public key must use this `authorized_keys` prefix:

```text
restrict,command="sudo -n /usr/local/sbin/redakt-stalwart-deploy"
```

If the new container fails its health check, the helper starts the exact prior
image again and retains the archives for a deliberate restore. It does not
automatically overwrite the mail volumes during rollback.

Official install notes: [Stalwart on Docker](https://stalw.art/docs/install/platform/docker/).
