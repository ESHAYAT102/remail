CREATE TABLE "mail_collection_appearances" (
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_collection_appearances" ADD CONSTRAINT "mail_collection_appearances_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_collection_appearances_owner_uidx" ON "mail_collection_appearances" USING btree ("user_id","account_id","collection_id");