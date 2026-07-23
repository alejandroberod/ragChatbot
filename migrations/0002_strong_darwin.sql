ALTER TABLE "documents" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_name" text NOT NULL;--> statement-breakpoint
CREATE INDEX "userIdIndex" ON "documents" USING btree ("user_id");