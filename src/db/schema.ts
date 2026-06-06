import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// ── Section config shared type ──────────────────────────────────────
// Stored in masterProfiles.sectionConfig and applications.sectionConfig
// Each entry: { id, type, title, visible, order }

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Google sub / NextAuth user id
  email: text("email").notNull(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const masterProfiles = pgTable("master_profiles", {
  id: text("id").primaryKey(), // uuid
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  github: text("github").notNull().default(""),
  website: text("website").notNull().default(""),
  summary: text("summary").notNull().default(""),
  experience: jsonb("experience").notNull().default("[]"),
  education: jsonb("education").notNull().default("[]"),
  skills: jsonb("skills").notNull().default("[]"),
  projects: jsonb("projects").notNull().default("[]"),
  hobbies: jsonb("hobbies").notNull().default("[]"),
  certifications: jsonb("certifications").notNull().default("[]"),
  customSections: jsonb("custom_sections").notNull().default("[]"),
  sectionConfig: jsonb("section_config").notNull().default("[]"),
  genericExperience: jsonb("generic_experience").notNull().default("[]"),
  genericProjects: jsonb("generic_projects").notNull().default("[]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(), // uuid
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  roleTitle: text("role_title").notNull(),
  jobDescription: text("job_description").notNull(),
  jobUrl: text("job_url").notNull().default(""),
  status: text("status").notNull().default("draft"),
  tailoredSummary: text("tailored_summary").notNull().default(""),
  tailoredExperience: jsonb("tailored_experience").notNull().default("[]"),
  tailoredSkills: jsonb("tailored_skills").notNull().default("[]"),
  tailoredProjects: jsonb("tailored_projects").notNull().default("[]"),
  tailoredHobbies: jsonb("tailored_hobbies").notNull().default("[]"),
  coverLetterBody: text("cover_letter_body").notNull().default(""),
  sectionConfig: jsonb("section_config").notNull().default("[]"),
  // Snapshot of profile data at generation time
  profileSnapshot: jsonb("profile_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const googleSheetsConnections = pgTable("google_sheets_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  spreadsheetId: text("spreadsheet_id").notNull(),
  sheetName: text("sheet_name").notNull().default("Applications"),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
