CREATE TABLE "pdf_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"strategy" text NOT NULL,
	"file_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pdf_files_user_id_unique" UNIQUE("user_id")
);
