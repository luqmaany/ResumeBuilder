CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"role_title" text NOT NULL,
	"job_description" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"tailored_summary" text DEFAULT '' NOT NULL,
	"tailored_experience" jsonb DEFAULT '[]' NOT NULL,
	"tailored_skills" jsonb DEFAULT '[]' NOT NULL,
	"tailored_projects" jsonb DEFAULT '[]' NOT NULL,
	"tailored_hobbies" jsonb DEFAULT '[]' NOT NULL,
	"cover_letter_body" text DEFAULT '' NOT NULL,
	"section_config" jsonb DEFAULT '[]' NOT NULL,
	"profile_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_sheets_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"spreadsheet_id" text NOT NULL,
	"sheet_name" text DEFAULT 'Applications' NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"access_token" text,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"linkedin" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"experience" jsonb DEFAULT '[]' NOT NULL,
	"education" jsonb DEFAULT '[]' NOT NULL,
	"skills" jsonb DEFAULT '[]' NOT NULL,
	"projects" jsonb DEFAULT '[]' NOT NULL,
	"hobbies" jsonb DEFAULT '[]' NOT NULL,
	"certifications" jsonb DEFAULT '[]' NOT NULL,
	"custom_sections" jsonb DEFAULT '[]' NOT NULL,
	"section_config" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_sheets_connections" ADD CONSTRAINT "google_sheets_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD CONSTRAINT "master_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;