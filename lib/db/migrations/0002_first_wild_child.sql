CREATE TABLE "mail_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connector" text NOT NULL,
	"external_account_id" text NOT NULL,
	"auth_account_id" text,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"image" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"sync_cursor" text,
	"subscription_expires_at" timestamp,
	"last_synced_at" timestamp,
	"sync_revision" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_auth_account_id_account_id_fk" FOREIGN KEY ("auth_account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_accounts_user_connector_external_uidx" ON "mail_accounts" USING btree ("user_id","connector","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_accounts_auth_account_uidx" ON "mail_accounts" USING btree ("auth_account_id");