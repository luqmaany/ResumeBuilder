import { z } from "zod";

export const experienceItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().default(""),
  startDate: z.string(),
  endDate: z.string().default("Present"),
  bullets: z.array(z.string()),
});

export const educationItemSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string(),
  gpa: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const projectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  technologies: z.string().optional().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default("Present"),
  url: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const certificationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().default(""),
  date: z.string().default(""),
});

export const customSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().default(""),
      bullets: z.array(z.string()).default([]),
    })
  ),
});

export const sectionConfigItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "hobbies",
    "custom",
  ]),
  title: z.string(),
  visible: z.boolean().default(true),
  order: z.number(),
  customSectionId: z.string().optional(),
});

export const masterProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  website: z.string().default(""),
  summary: z.string().default(""),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  skills: z.array(z.string()).default([]),
  projects: z.array(projectItemSchema).default([]),
  hobbies: z.array(z.string()).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  customSections: z.array(customSectionSchema).default([]),
  sectionConfig: z.array(sectionConfigItemSchema).default([]),
});

export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type CertificationItem = z.infer<typeof certificationItemSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;
export type SectionConfigItem = z.infer<typeof sectionConfigItemSchema>;
export type MasterProfile = z.infer<typeof masterProfileSchema>;

export const applicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  roleTitle: z.string().min(1, "Role title is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  status: z
    .enum(["draft", "generated", "applied", "interview", "offer", "rejected"])
    .default("draft"),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const DEFAULT_SECTION_CONFIG: SectionConfigItem[] = [
  { id: "summary", type: "summary", title: "Professional Summary", visible: true, order: 0 },
  { id: "experience", type: "experience", title: "Experience", visible: true, order: 1 },
  { id: "education", type: "education", title: "Education", visible: true, order: 2 },
  { id: "skills", type: "skills", title: "Skills", visible: true, order: 3 },
  { id: "projects", type: "projects", title: "Projects", visible: true, order: 4 },
  { id: "hobbies", type: "hobbies", title: "Hobbies & Interests", visible: true, order: 5 },
  { id: "certifications", type: "certifications", title: "Certifications", visible: true, order: 6 },
];

export function normalizeSectionConfig(
  saved: SectionConfigItem[] | unknown[] | null | undefined
): SectionConfigItem[] {
  const config =
    Array.isArray(saved) && saved.length > 0
      ? (saved as SectionConfigItem[])
      : DEFAULT_SECTION_CONFIG;
  const savedTypes = new Set(config.map((s) => s.type));
  const missing = DEFAULT_SECTION_CONFIG.filter((d) => !savedTypes.has(d.type));
  if (missing.length === 0) return config;
  const maxOrder = Math.max(...config.map((s) => s.order));
  return [...config, ...missing.map((m, i) => ({ ...m, order: maxOrder + 1 + i }))];
}

export function isSectionVisible(
  config: SectionConfigItem[],
  type: SectionConfigItem["type"]
): boolean {
  return config.find((s) => s.type === type)?.visible ?? true;
}

export function setSectionVisible(
  config: SectionConfigItem[],
  type: SectionConfigItem["type"],
  visible: boolean
): SectionConfigItem[] {
  return config.map((s) => (s.type === type ? { ...s, visible } : s));
}

export const MAX_TAILORED_SKILLS = 10;

export function limitTailoredSkills(skills: string[]): string[] {
  return skills.filter(Boolean).slice(0, MAX_TAILORED_SKILLS);
}
