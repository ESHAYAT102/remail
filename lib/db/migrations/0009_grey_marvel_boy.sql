UPDATE "account"
SET
  "access_token" = NULL,
  "refresh_token" = NULL,
  "id_token" = NULL,
  "access_token_expires_at" = NULL,
  "refresh_token_expires_at" = NULL,
  "scope" = NULL,
  "updated_at" = NOW()
WHERE "provider_id" = 'google'
  AND "scope" LIKE '%https://www.googleapis.com/auth/gmail.modify%';

DROP TABLE "mail_accounts" CASCADE;
