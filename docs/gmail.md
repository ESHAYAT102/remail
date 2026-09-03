# Gmail connector

Redakt uses the Gmail API as a mailbox connector. Gmail remains the source of
truth: Redakt stores an encrypted OAuth grant, account identity, a Gmail history
cursor, subscription expiry, health, and a monotonic UI revision. It does not
persist Gmail message bodies or attachments. Those are fetched on demand and
responses are marked private and `no-store`.

Google sign-in and Gmail mailbox access are separate authorization steps. Sign
in requests only `openid`, `email`, and `profile`. Connecting Gmail adds
`gmail.modify`, offline access, and incremental authorization. A Google-auth
user can therefore use Redakt without granting mailbox access, and reconnecting
to Redakt does not downgrade or replace an existing Gmail grant.

Choosing Gmail as the first onboarding option is an explicit request to do both
at once: authenticate the Redakt account with Google and grant Gmail mailbox
access in the same OAuth consent flow. Choosing a custom domain keeps Google
out of the account entirely.

## Deployment model

Use one Google OAuth web client for both Google sign-in and Gmail authorization
within an environment. Do not create separate "login" and "Gmail" clients.

Do not share that client or its Google Cloud project between staging and
production. Google’s current
[OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies#use-separate-projects-for-testing-and-production)
requires a separate Cloud project for each development, testing, staging, and
production tier. Although a web client can technically list multiple redirect
URIs, using one project for staging and production is not the compliant setup.

The smallest Redakt setup is therefore:

| Tier | Google Cloud project | OAuth publishing status | Redakt origin |
| --- | --- | --- | --- |
| Staging | `redakt-staging-507419` | Testing | `https://redakt-staging.up.railway.app` |
| Production | `redakt-507419` | In production, verified | `https://redakt.app` |

Local demo mode does not call Google. If real local OAuth is required, create a
third development project and register
`http://localhost:3000/api/auth/callback/google`; do not reuse staging or
production credentials. A stable `https://staging.redakt.app` origin is better
than the generated Railway hostname once that DNS name is available. Change
`BETTER_AUTH_URL` and the registered callback together when adopting it.

The remaining steps must be completed once in each project. The values and
credentials must stay isolated even when the same Google Workspace organization
owns both projects.

## Enable the APIs

1. Create the staging or production project in the
   [Google Cloud console](https://console.cloud.google.com/projectcreate), then
   make sure it remains selected in the project picker for every following
   step.
2. Open **APIs & Services → Library**, search for **Gmail API**, and enable it.
3. Search for **Cloud Pub/Sub API** and enable it. Pub/Sub is optional for basic
   polling but required for near-real-time inbox updates.

The Gmail API must be enabled in the same project as the OAuth client. The
Pub/Sub topic used by `users.watch` must also belong to that project; Gmail
requires the project identifier in the topic name to exactly match the project
executing the watch request. See the
[`users.watch` reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch).

## Configure the Google Auth Platform

Open **Google Auth Platform** in the selected project and complete each section.
Google’s current console groups the former "OAuth consent screen" under
**Branding**, **Audience**, **Clients**, **Data Access**, and **Verification
Center**.

### Branding

Use the same public brand in both projects:

- App name: `Redakt`
- User support email: a monitored Redakt support address
- App logo: the Redakt logo; adding a logo can trigger brand verification
- Application home page: `https://redakt.app`
- Privacy policy: `https://redakt.app/privacy`
- Terms of service: `https://redakt.app/terms`
- Authorized domain: `redakt.app`
- Developer contact email: a monitored operational address

The home page must describe the product and link to the privacy policy and
terms. The privacy policy must explain what Google data Redakt accesses, how it
uses and protects that data, how a user disconnects/deletes it, and include a
Google API Services User Data Policy Limited Use disclosure. Verify ownership
of `redakt.app` with the same Google account or organization used for the Cloud
projects.

Redakt ships both legal routes publicly and links them from the application home
page. Keep the URLs above identical to the values in the production OAuth consent
screen.

### Audience

1. Select **External** so personal Gmail and external Google Workspace accounts
   can connect.
2. In staging, leave the publishing status at **Testing** and add each engineer
   or QA account under **Test users**. Testing is limited to 100 test users.
3. Expect a staging Gmail grant and its offline refresh token to expire after
   seven days. Google exempts basic identity-only sign-in from this expiry, but
   not the `gmail.modify` grant. Reconnect Gmail when testing beyond that window.
4. In production, choose **Publish app** only when the public site, legal pages,
   demonstration video, and verification submission are ready.

See Google’s current
[Audience behavior](https://support.google.com/cloud/answer/15549945), including
the Testing limits and seven-day authorization expiry.

### Data Access

Choose **Add or remove scopes** and declare exactly the scopes Redakt requests:

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/gmail.modify
```

The first three scopes identify the user. Redakt requests `gmail.modify` only
after the user explicitly chooses Gmail during onboarding or selects **Add
Gmail account** in settings. It supports reading, drafts, sending, labels,
archive, spam, and trash without allowing immediate permanent deletion. It is
the narrowest single Gmail scope that supports the implemented full-client
behavior. Google classifies it as restricted; see the
[Gmail scope table](https://developers.google.com/workspace/gmail/api/auth/scopes).

### OAuth client

1. Open **Clients → Create client**.
2. Select **Web application**.
3. Name the client `Redakt staging web` or `Redakt production web`.
4. Leave **Authorized JavaScript origins** empty. Redakt uses a server-side
   authorization-code flow, not Google’s browser JavaScript SDK.
5. Add exactly one authorized redirect URI for the project:

   | Tier | Authorized redirect URI |
   | --- | --- |
   | Staging | `https://redakt-staging.up.railway.app/api/auth/callback/google` |
   | Production | `https://redakt.app/api/auth/callback/google` |

   The scheme, host, port, path, and trailing slash must match exactly. Wildcards
   are not allowed. Google may take several minutes to propagate edits.
6. Create the client, then copy the client ID and secret immediately. New Google
   clients show the complete secret only when it is created. Store it in Railway
   or another secret manager, never in Git, `.env.example`, tickets, or chat.

The callback above is shared by both Redakt flows. Better Auth uses the identity
scopes for sign-in and incrementally adds `gmail.modify` with offline access
when the user connects Gmail.

## Configure Redakt on Railway

Set these variables independently on the `redakt` service in the staging and
production Railway environments. The repository’s `.railway/railway.ts` marks
the credentials as `preserve()`, so future IaC applies retain the dashboard
values without committing them.

| Variable | Staging | Production |
| --- | --- | --- |
| `DEMO_MODE` | `false` | `false` |
| `BETTER_AUTH_URL` | `https://redakt-staging.up.railway.app` | `https://redakt.app` |
| `GOOGLE_CLIENT_ID` | Client from `redakt-staging-507419` | Client from `redakt-507419` |
| `GOOGLE_CLIENT_SECRET` | Secret from `redakt-staging-507419` | Secret from `redakt-507419` |
| `GOOGLE_PUBSUB_TOPIC` | `projects/STAGING_PROJECT_ID/topics/redakt-gmail-events` | `projects/PRODUCTION_PROJECT_ID/topics/redakt-gmail-events` |
| `GOOGLE_PUBSUB_AUDIENCE` | `https://redakt-staging.up.railway.app/api/mail/sync/google-pubsub` | `https://redakt.app/api/mail/sync/google-pubsub` |
| `GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL` | Push account from the staging project | Push account from the production project |
| `MAIL_SYNC_CRON_SECRET` | Unique random secret | Different unique random secret |
| `BETTER_AUTH_SECRET` | Unique random key | Different unique random key |
| `BETTER_AUTH_SECRETS` | `1:` plus the staging auth key | `1:` plus the production auth key |

For a new environment, generate a different auth key and cron secret for each
tier:

```sh
openssl rand -base64 32
openssl rand -base64 32
```

Use the first output as both `BETTER_AUTH_SECRET` and the value after `1:` in
`BETTER_AUTH_SECRETS`. Use the second as `MAIL_SYNC_CRON_SECRET`. Do not copy
either output into documentation or source control. A Railway variable change
must finish deploying before OAuth is tested.

### Troubleshoot an internal-host redirect

If Google returns to a URL such as `https://<container>:3000/...`, first verify
that `BETTER_AUTH_URL` is the public HTTPS origin for that Railway environment.
The Gmail completion route deliberately builds its final redirect from this
canonical value rather than the application server's internal request URL.
Live mode refuses to initialize authentication when `BETTER_AUTH_URL` is
missing or is not an HTTP(S) origin; only local demo mode defaults to
`http://localhost:3000`.
For staging, a successful connection must end at:

```text
https://redakt-staging.up.railway.app/mail/settings/account?connected=1
```

Also confirm the Google OAuth client still has the matching public
`/api/auth/callback/google` URI. An internal Railway hostname must never appear
in Google Console or in a browser-visible redirect.

## Schedule Gmail watch renewal

Gmail watches expire, so each Google Cloud project needs a daily authenticated
request to its matching Redakt environment. Enable Cloud Scheduler, enter the
same `MAIL_SYNC_CRON_SECRET` stored in that Railway environment when prompted,
and create the job after the `/api/mail/sync/renew` route is deployed:

```sh
export REDAKT_GOOGLE_PROJECT="redakt-staging-507419"
export REDAKT_HOST="https://redakt-staging.up.railway.app"

gcloud services enable cloudscheduler.googleapis.com \
  --project="$REDAKT_GOOGLE_PROJECT"

read -rsp "MAIL_SYNC_CRON_SECRET: " REDAKT_CRON_SECRET
echo
gcloud scheduler jobs create http redakt-gmail-watch-renewal \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --location=us-central1 \
  --schedule="17 3 * * *" \
  --time-zone=Etc/UTC \
  --uri="$REDAKT_HOST/api/mail/sync/renew" \
  --http-method=POST \
  --headers="Authorization=Bearer ${REDAKT_CRON_SECRET},Content-Type=application/json" \
  --attempt-deadline=300s \
  --max-retry-attempts=3 \
  --description="Renew Redakt Gmail push watches before expiration"
unset REDAKT_CRON_SECRET
```

Run the same commands for production with:

```sh
export REDAKT_GOOGLE_PROJECT="redakt-507419"
export REDAKT_HOST="https://redakt.app"
```

Use the production `MAIL_SYNC_CRON_SECRET`, not the staging value. The identical
job name is safe because the jobs live in separate projects. If a job already
exists, replace `create http` with `update http`. Do not add an OAuth or OIDC
flag: the endpoint intentionally authenticates the private bearer secret in the
`Authorization` header.

If infrastructure is provisioned before the Redakt release, keep the job paused
to avoid expected `404` retries, then resume it after deployment:

```sh
gcloud scheduler jobs pause redakt-gmail-watch-renewal \
  --project="$REDAKT_GOOGLE_PROJECT" --location=us-central1
gcloud scheduler jobs resume redakt-gmail-watch-renewal \
  --project="$REDAKT_GOOGLE_PROJECT" --location=us-central1
```

## Production verification

The production project cannot launch Gmail access as an ordinary public app
until Google approves `gmail.modify`. In **Verification Center**:

1. Publish the app to **In production** and choose **Prepare for verification**.
2. Confirm the app name, verified domain, home page, privacy policy, terms,
   support address, developer contacts, client, and exact scopes.
3. Provide a scope justification explaining that Redakt is a user-facing Gmail
   client and needs to read messages, compose drafts, send mail, and modify
   labels/state; narrower read-only or send-only scopes cannot provide that
   functionality.
4. Upload an unlisted YouTube demonstration in English showing the complete
   consent screen and all three entry points: Google sign-in, choosing Gmail in
   onboarding, and adding Gmail from settings. Show inbox reading, compose/send,
   draft and message-state actions, and disconnecting the account.
5. Submit the restricted-scope review and respond to the Google review team from
   the project owner/editor email addresses.
6. Complete the security assessment Google requests. Because restricted Gmail
   data passes through Redakt’s server, Google’s rules require an assessment and
   annual revalidation even though Redakt does not persist message bodies or
   attachments.

Google says development, testing, and staging apps are not submitted for
verification; keep the staging project in Testing. Current details are in
Google’s [submission guide](https://support.google.com/cloud/answer/13461325),
[verification requirements](https://support.google.com/cloud/answer/13464321),
and [security-assessment guide](https://support.google.com/cloud/answer/13465431).

## Configure near-real-time updates

Polling works without Pub/Sub. For staging parity and near-real-time production
updates, repeat this setup in both projects. The easiest place to run it is
Google Cloud Shell. Set the first two values for the environment before running
the block:

```sh
REDAKT_GOOGLE_PROJECT="replace-with-staging-project-id"
REDAKT_APP_ORIGIN="https://redakt-staging.up.railway.app"
REDAKT_TOPIC="redakt-gmail-events"
REDAKT_SUBSCRIPTION="redakt-gmail-push"
REDAKT_PUSH_SA_NAME="redakt-pubsub-push"

gcloud config set project "$REDAKT_GOOGLE_PROJECT"
gcloud services enable \
  gmail.googleapis.com \
  iam.googleapis.com \
  pubsub.googleapis.com

# Ensure Pub/Sub's Google-managed service agent exists before granting it IAM.
gcloud beta services identity create \
  --service=pubsub.googleapis.com \
  --project="$REDAKT_GOOGLE_PROJECT"

REDAKT_GOOGLE_PROJECT_NUMBER="$(gcloud projects describe \
  "$REDAKT_GOOGLE_PROJECT" --format='value(projectNumber)')"
REDAKT_PUSH_SA_EMAIL="${REDAKT_PUSH_SA_NAME}@${REDAKT_GOOGLE_PROJECT}.iam.gserviceaccount.com"
REDAKT_PUBSUB_AGENT="service-${REDAKT_GOOGLE_PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
REDAKT_PUSH_ENDPOINT="${REDAKT_APP_ORIGIN}/api/mail/sync/google-pubsub"

gcloud pubsub topics create "$REDAKT_TOPIC" \
  --project="$REDAKT_GOOGLE_PROJECT"
gcloud pubsub topics add-iam-policy-binding "$REDAKT_TOPIC" \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher

gcloud iam service-accounts create "$REDAKT_PUSH_SA_NAME" \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --display-name="Redakt Pub/Sub push identity"

# Grant only the Google-managed Pub/Sub agent permission to mint an OIDC token
# as the dedicated push identity.
gcloud iam service-accounts add-iam-policy-binding \
  "$REDAKT_PUSH_SA_EMAIL" \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --member="serviceAccount:${REDAKT_PUBSUB_AGENT}" \
  --role=roles/iam.serviceAccountTokenCreator

gcloud pubsub subscriptions create "$REDAKT_SUBSCRIPTION" \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --topic="$REDAKT_TOPIC" \
  --push-endpoint="$REDAKT_PUSH_ENDPOINT" \
  --push-auth-service-account="$REDAKT_PUSH_SA_EMAIL" \
  --push-auth-token-audience="$REDAKT_PUSH_ENDPOINT" \
  --expiration-period=never
```

The person creating the subscription needs permission to attach the push
service account (`iam.serviceAccounts.actAs`). The Pub/Sub service agent needs
`roles/iam.serviceAccountTokenCreator` so it can mint the signed OIDC token. If
subscription creation fails specifically on `iam.serviceAccounts.actAs`, an IAM
administrator must grant that operator `roles/iam.serviceAccountUser` on the
`redakt-pubsub-push` service account; do not make the push account a project
owner or editor.

Set the resulting values in the matching Railway environment:

```text
GOOGLE_PUBSUB_TOPIC=projects/PROJECT_ID/topics/redakt-gmail-events
GOOGLE_PUBSUB_AUDIENCE=https://REDAKT_HOST/api/mail/sync/google-pubsub
GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL=redakt-pubsub-push@PROJECT_ID.iam.gserviceaccount.com
```

Redakt verifies Google’s signature, issuer, audience, verified-email claim, and
exact service-account identity. Do not enable Pub/Sub payload unwrapping; the
webhook expects the standard Pub/Sub envelope.

After those three variables are deployed, publish a harmless notification to
verify the authenticated push path. The address deliberately matches no Redakt
account, so the endpoint validates and acknowledges the message without
changing a mailbox:

```sh
gcloud pubsub topics publish "$REDAKT_TOPIC" \
  --project="$REDAKT_GOOGLE_PROJECT" \
  --message='{"emailAddress":"pubsub-smoke-test@example.invalid","historyId":"1"}'
```

In **Pub/Sub → Subscriptions → redakt-gmail-push → Metrics**, confirm the push
was acknowledged with a `2xx` response. A `401` means the Railway audience or
service-account email does not exactly match the subscription. A `404` means
the endpoint origin or path is wrong. A `503` means the three Pub/Sub variables
are absent from the running Redakt deployment.

Finally:

1. Connect one designated staging Gmail account. Redakt calls `users.watch`
   after enrollment; a successful call immediately publishes a notification.
2. Confirm the push subscription has acknowledged deliveries and the Redakt
   webhook returns `204`.
3. Schedule one authenticated `POST` per day to
   `/api/mail/sync/renew` using `Authorization: Bearer $MAIL_SYNC_CRON_SECRET`.
   Gmail watches expire and must be renewed at least every seven days; Redakt
   renews subscriptions that are within 36 hours of expiration. See the
   [Gmail push guide](https://developers.google.com/workspace/gmail/api/guides/push).

Use a different Gmail test mailbox in staging and production. A Gmail watch is
configured per mailbox, so exercising the same mailbox across environments can
make push testing ambiguous. Foreground polling remains a fallback.

Pub/Sub notifications are signals only. The webhook never receives or stores a
message body; the browser’s next authenticated sync reads Gmail history and
refreshes the live mailbox view. A 30-second foreground poll is retained as a
fallback because Google documents that push notifications can occasionally be
delayed or dropped.

## Credential lifecycle

- Access and refresh tokens are encrypted at rest by Better Auth with
  XChaCha20-Poly1305 authenticated encryption.
- Google identity tokens are removed after account enrollment and are not kept
  as mailbox credentials.
- Disconnecting a Gmail account stops its watch, revokes the Google grant,
  clears local token material, and deletes only Redakt’s connection metadata.
  It never deletes mail from Gmail.
- A key rotation adds a new first entry to `BETTER_AUTH_SECRETS`; old versions
  remain available for decryption until affected grants have refreshed.
