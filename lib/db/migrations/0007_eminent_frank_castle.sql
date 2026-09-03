CREATE TABLE "resend_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resend_credentials" ADD CONSTRAINT "resend_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;