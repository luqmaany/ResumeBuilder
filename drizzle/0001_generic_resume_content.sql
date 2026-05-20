ALTER TABLE "master_profiles" ADD COLUMN IF NOT EXISTS "github" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN IF NOT EXISTS "generic_experience" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN IF NOT EXISTS "generic_projects" jsonb DEFAULT '[]' NOT NULL;
