# Cloudflare DNS

The intended Cloudflare account is `Adaaanniel@gmail.com's Account`
(`6c3eb32007e172c1b4429c6b428aff97`). The local Wrangler profile
`redakt-personal` is bound to this repository and should be checked before any
Cloudflare command:

```bash
pnpm exec wrangler whoami
```

Wrangler can verify the account identity, but it does not expose zone or DNS
record management commands. Its OAuth profiles currently grant zone read only.
Automated DNS writes therefore require a separately scoped Cloudflare API token
with `Zone:DNS:Edit`; keep that token out of source control.

`redakt.app` is active on Cloudflare under zone
`db531cb345965de1d8ebab3d46f4d498`, using `beth.ns.cloudflare.com` and
`dakota.ns.cloudflare.com`.

## Application records

Railway provides both records after `redakt.app` is attached to the Redakt
service:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` | `pzhpgxwa.up.railway.app` | Proxied |
| TXT | `_railway-verify` | `railway-verify=3aa4618d1589da41960090fe8af1ab6cf40e4041eb5e1f617c6320c320b67c66` | DNS only |

Use Cloudflare SSL/TLS mode **Full** for the proxied Railway hostname, following
Railway's current Cloudflare guidance.

## Mail records

The VPS address is `192.99.212.236`. Keep the `mail` record DNS-only. Do not
publish MX, SPF, DKIM, or DMARC until its PTR is `mail.redakt.app`, Stalwart is
serving a trusted certificate, and inbound and outbound TCP 25 have both been
verified.

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `mail` | `192.99.212.236` | DNS only |
| MX | `@` | `mail.redakt.app` | DNS only |
| TXT | `@` | Stalwart SPF value | DNS only |
| TXT | Stalwart DKIM selector | Stalwart DKIM value | DNS only |
| TXT | `_dmarc` | Initial monitoring policy | DNS only |

The `mail` address record must never be proxied through Cloudflare's ordinary
HTTP proxy.

## Cutover order

1. Add the Railway apex CNAME and verification TXT records.
2. Confirm Cloudflare SSL/TLS mode is Full and `redakt.app` works over HTTPS.
3. Change `mail` to DNS-only before opening any mail service ports.
4. Verify the OVH PTR plus inbound and outbound TCP 25.
5. Bootstrap Stalwart and retrieve its SPF and DKIM values.
6. Add MX, SPF, DKIM, and DMARC only after those readiness gates pass.
