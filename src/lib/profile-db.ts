import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { MasterProfile } from "@/lib/types";

const baseProfileSelect = {
  id: masterProfiles.id,
  userId: masterProfiles.userId,
  fullName: masterProfiles.fullName,
  email: masterProfiles.email,
  phone: masterProfiles.phone,
  location: masterProfiles.location,
  linkedin: masterProfiles.linkedin,
  github: masterProfiles.github,
  website: masterProfiles.website,
  summary: masterProfiles.summary,
  experience: masterProfiles.experience,
  education: masterProfiles.education,
  skills: masterProfiles.skills,
  projects: masterProfiles.projects,
  hobbies: masterProfiles.hobbies,
  certifications: masterProfiles.certifications,
  customSections: masterProfiles.customSections,
  sectionConfig: masterProfiles.sectionConfig,
  updatedAt: masterProfiles.updatedAt,
};

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    (typeof e.message === "string" &&
      (e.message.includes("generic_experience") ||
        e.message.includes("generic_projects") ||
        e.message.includes("does not exist")))
  );
}

export function normalizeProfileRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...row,
    genericExperience: Array.isArray(row.genericExperience) ? row.genericExperience : [],
    genericProjects: Array.isArray(row.genericProjects) ? row.genericProjects : [],
  };
}

export async function fetchMasterProfile(userId: string) {
  try {
    const rows = await db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, userId))
      .limit(1);
    if (rows.length === 0) return null;
    return normalizeProfileRow(rows[0] as Record<string, unknown>);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    const rows = await db
      .select(baseProfileSelect)
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, userId))
      .limit(1);
    if (rows.length === 0) return null;
    return normalizeProfileRow(rows[0] as Record<string, unknown>);
  }
}

type ProfileUpdate = Omit<MasterProfile, never>;

export async function saveMasterProfile(userId: string, data: ProfileUpdate) {
  const baseUpdate = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    location: data.location,
    linkedin: data.linkedin,
    github: data.github,
    website: data.website,
    summary: data.summary,
    experience: data.experience,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    hobbies: data.hobbies,
    certifications: data.certifications,
    customSections: data.customSections,
    sectionConfig: data.sectionConfig,
    updatedAt: new Date(),
  };

  try {
    await db
      .update(masterProfiles)
      .set({
        ...baseUpdate,
        genericExperience: data.genericExperience,
        genericProjects: data.genericProjects,
      })
      .where(eq(masterProfiles.userId, userId));
    return { genericResumePersisted: true };
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    await db
      .update(masterProfiles)
      .set(baseUpdate)
      .where(eq(masterProfiles.userId, userId));
    return { genericResumePersisted: false };
  }
}
