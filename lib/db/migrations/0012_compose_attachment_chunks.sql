CREATE TABLE "compose_attachment_chunks" (
	"upload_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compose_attachment_chunks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
CREATE UNIQUE INDEX "compose_attachment_chunk_unique" ON "compose_attachment_chunks" USING btree ("upload_id","chunk_index");
CREATE INDEX "compose_attachment_chunk_user_idx" ON "compose_attachment_chunks" USING btree ("user_id");
