ALTER TABLE "master_profiles" ADD COLUMN "generic_experience" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN "generic_projects" jsonb DEFAULT '[]' NOT NULL;
