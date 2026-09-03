CREATE TABLE "hosted_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"content_id" text,
	"inline" boolean DEFAULT false NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosted_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"provider_email_id" text NOT NULL,
	"message_id" text,
	"thread_id" text NOT NULL,
	"direction" text NOT NULL,
	"folder" text NOT NULL,
	"unread" boolean DEFAULT true NOT NULL,
	"from" jsonb NOT NULL,
	"to" jsonb NOT NULL,
	"cc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bcc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"text" text,
	"html" text,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hosted_attachments" ADD CONSTRAINT "hosted_attachments_message_id_hosted_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."hosted_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosted_messages" ADD CONSTRAINT "hosted_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosted_messages" ADD CONSTRAINT "hosted_messages_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hosted_messages_provider_email_uidx" ON "hosted_messages" USING btree ("provider_email_id");--> statement-breakpoint
CREATE INDEX "hosted_messages_user_thread_idx" ON "hosted_messages" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "hosted_messages_user_folder_idx" ON "hosted_messages" USING btree ("user_id","folder");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_name_uidx" ON "domains" USING btree ("name");