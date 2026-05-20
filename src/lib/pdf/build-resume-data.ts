import {
  isSectionVisible,
  limitTailoredSkills,
  normalizeSectionConfig,
  type SectionConfigItem,
} from "@/lib/types";

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  experience: unknown[];
  education: unknown[];
  skills: string[];
  hobbies: string[];
  projects: unknown[];
  sectionConfig: SectionConfigItem[];
}

type ProfileFields = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  summary?: string | null;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  projects?: unknown;
  hobbies?: unknown;
  sectionConfig?: unknown;
};

export function buildResumeDataFromProfile(profile: ProfileFields): ResumeData {
  const sectionConfig = normalizeSectionConfig(
    profile.sectionConfig as Parameters<typeof normalizeSectionConfig>[0]
  );
  const projectsVisible = isSectionVisible(sectionConfig, "projects");

  return {
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    linkedin: profile.linkedin ?? "",
    github: profile.github ?? "",
    website: profile.website ?? "",
    summary: profile.summary ?? "",
    experience: (profile.experience as unknown[]) ?? [],
    education: (profile.education as unknown[]) ?? [],
    skills: ((profile.skills as string[]) ?? []).filter(Boolean),
    hobbies: ((profile.hobbies as string[]) ?? []).filter(Boolean),
    projects: projectsVisible ? ((profile.projects as unknown[]) ?? []) : [],
    sectionConfig,
  };
}

type ApplicationFields = {
  tailoredSummary?: string | null;
  tailoredExperience?: unknown;
  tailoredSkills?: unknown;
  tailoredProjects?: unknown;
  tailoredHobbies?: unknown;
  sectionConfig?: unknown;
  profileSnapshot?: unknown;
};

export function buildResumeDataFromApplication(
  app: ApplicationFields,
  profile: ProfileFields | null | undefined
): ResumeData {
  const snapshot = (app.profileSnapshot ?? {}) as Record<string, unknown>;
  const sectionConfig = normalizeSectionConfig(
    app.sectionConfig as Parameters<typeof normalizeSectionConfig>[0]
  );
  const projectsVisible = isSectionVisible(sectionConfig, "projects");
  const tailoredProjects = app.tailoredProjects as unknown[];

  return {
    fullName: (snapshot.fullName as string) ?? profile?.fullName ?? "",
    email: (snapshot.email as string) ?? profile?.email ?? "",
    phone: (snapshot.phone as string) ?? profile?.phone ?? "",
    location: (snapshot.location as string) ?? profile?.location ?? "",
    linkedin: (snapshot.linkedin as string) ?? profile?.linkedin ?? "",
    github: (snapshot.github as string) ?? profile?.github ?? "",
    website: (snapshot.website as string) ?? profile?.website ?? "",
    summary: app.tailoredSummary || profile?.summary || "",
    experience: (app.tailoredExperience as unknown[]) ?? [],
    education: (snapshot.education ?? profile?.education ?? []) as unknown[],
    skills: limitTailoredSkills((app.tailoredSkills as string[]) ?? []),
    hobbies: ((app.tailoredHobbies as string[])?.length
      ? app.tailoredHobbies
      : (snapshot.hobbies ?? profile?.hobbies ?? [])) as string[],
    projects: !projectsVisible
      ? []
      : ((tailoredProjects?.length
          ? tailoredProjects
          : (snapshot.projects ?? profile?.projects ?? [])) as unknown[]),
    sectionConfig,
  };
}

export function resumePdfFilename(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9]/g, "_") || "Resume";
  return `${safe}_Resume.pdf`;
}
