import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  isSectionVisible,
  limitTailoredSkills,
  MAX_TAILORED_SKILLS,
  normalizeSectionConfig,
} from "@/lib/types";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_EXPERIENCE_BULLETS = 3;

/**
 * The prompt asks for a fixed number of bullets per entry, but the model can overshoot.
 * Drop empty strings and trim to `max` — never pad, since padding would mean inventing content.
 */
function limitBullets(entries: unknown, max?: number) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const { bullets } = entry as { bullets?: unknown };
    if (!Array.isArray(bullets)) return entry;
    const cleaned = bullets.filter(
      (bullet): bullet is string => typeof bullet === "string" && bullet.trim().length > 0
    );
    return { ...entry, bullets: max === undefined ? cleaned : cleaned.slice(0, max) };
  });
}

export class TailorError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function tailorApplication(applicationId: string, userId: string) {
  const [appRows, profileRows] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1),
    db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, userId))
      .limit(1),
  ]);

  if (appRows.length === 0) {
    throw new TailorError("Application not found", 404);
  }
  if (profileRows.length === 0) {
    throw new TailorError("Please fill in your profile first", 400);
  }

  const app = appRows[0];
  const profile = profileRows[0];
  const sectionConfig = normalizeSectionConfig(
    profile.sectionConfig as Parameters<typeof normalizeSectionConfig>[0]
  );
  const hiddenSections = sectionConfig.filter((section) => !section.visible);

  const systemPrompt = `You are a professional resume writer. Given the candidate's master profile and a job description, produce the fields below in the order listed.

1. The "required tech stack": scan the job description and extract every programming language explicitly mentioned (e.g. Python, TypeScript, Go, Java, Rust, SQL) and every framework, library, and tool mentioned (e.g. React, Node.js, Django, Kubernetes). Produce this list FIRST — the remaining fields depend on it.
2. A tailored professional summary (2-3 sentences) that highlights the candidate's most relevant strengths for this specific role. Naturally mention 1-2 languages or technologies from the required tech stack that the candidate actually has.
3. A curated selection of the candidate's most relevant work experiences for this role. Strongly prefer experiences where the candidate used languages or technologies from the required tech stack. Omit roles that add little value for this specific position. For each selected experience, output exactly ${MAX_EXPERIENCE_BULLETS} bullet points (no fewer, no more). Write every bullet using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]" — i.e. lead with a strong action verb, state the impact/result (X), back it with a concrete metric (Y, e.g. %, $, time saved, scale/volume), and name the action or method used (Z), including the relevant languages and technologies (e.g. "Cut API response time by 40% by refactoring the data layer in Python/FastAPI" rather than just "Built REST APIs"). Use ONLY metrics that appear in the candidate's source bullets. Where the source has no number and a metric would strengthen the bullet, write the literal placeholder [metric] in its place (e.g. "Cut API response time by [metric] by refactoring the data layer in Python/FastAPI") so the candidate can fill in the real figure — NEVER estimate, approximate, or invent a number. Omit the placeholder entirely on bullets where a metric would not make sense. Combine or distill multiple source bullets into the ${MAX_EXPERIENCE_BULLETS} strongest lines — never introduce new duties or achievements not grounded in the original role. Keep the same employers, titles, and dates — NEVER invent or change factual information. Include at least 1 experience and no more than the top 4-5 most relevant roles.
4. Exactly ${MAX_TAILORED_SKILLS} skills (no more) most relevant to the job description — the single best subset for this role. Place languages and technologies from the required tech stack that the candidate actually has at the top, ordered by how prominently they appear in the job description. Omit lower-priority skills even if the candidate has many.
5. A curated selection of the candidate's most relevant projects for this role. Strongly prefer projects that used languages or technologies from the required tech stack. Omit projects that are not relevant. For each selected project, rewrite bullets using the XYZ formula on the same terms as the experience bullets above: lead with an action verb, state the impact (X), back it with a metric (Y) taken only from the source — otherwise the literal placeholder [metric] — and name the action and relevant languages/technologies used (Z). NEVER estimate or invent a figure. Keep the same project names, technologies, and dates — NEVER invent projects. Include at most the top 3-4 most relevant projects.
6. A tailored list of hobbies and interests most relevant to the role and company culture. Reorder by relevance and keep only genuine hobbies from the candidate's list — NEVER invent hobbies.
7. A professional cover letter body (3-4 paragraphs, no addresses/headers — the template handles formatting). The letter should reference the specific company, role title, and 2-3 languages or technologies from the required tech stack that the candidate has. Never use the [metric] placeholder in the cover letter — write around the missing number instead.

CRITICAL RULES:
- Each object in tailoredExperience must include exactly ${MAX_EXPERIENCE_BULLETS} strings in its "bullets" array.
- NEVER invent employers, job titles, dates, degrees, certifications, or projects.
- NEVER add experience or projects the candidate doesn't have.
- NEVER claim the candidate knows a language or technology that does not appear anywhere in their profile.
- Keep original date ranges exactly as provided.
- Write every experience and project bullet using the XYZ formula: accomplished [X] as measured by [Y], by doing [Z].
- NEVER invent, estimate, approximate, or extrapolate a number. Every figure, percentage, dollar amount, duration, and scale in the output must appear in the candidate's profile. Where a metric would strengthen a bullet but the profile provides none, write the literal placeholder [metric] for the candidate to fill in.
- Start each bullet with a strong action verb.
- Optimize for ATS keyword matching without keyword stuffing.
- Only include experiences and projects from the candidate's actual profile — select the most relevant subset, do not include all of them if some are not relevant.
- If the candidate has no projects, return an empty array for tailoredProjects.
- If the candidate has no hobbies, return an empty array for tailoredHobbies.
- tailoredSkills must contain at most ${MAX_TAILORED_SKILLS} items, ordered from most to least relevant for this job.
- The candidate has hidden these resume sections: ${
    hiddenSections.length > 0
      ? hiddenSections.map((section) => section.type).join(", ")
      : "none"
  }. For each hidden section, return an empty string or empty array for its corresponding tailored field. Never restore a section hidden in the profile.
- Copy each "id" verbatim from the corresponding entry in the candidate's profile. NEVER generate a new id.
- Always include every key in the schema below, using an empty string or empty array where a section has no content. Never omit a key.

Respond ONLY with valid JSON matching this schema, emitting the keys in exactly this order:
{
  "requiredTechStack": ["string"],
  "tailoredSummary": "string",
  "tailoredExperience": [{ "id": "string", "company": "string", "title": "string", "location": "string", "startDate": "string", "endDate": "string", "bullets": ["string", "string", "string"] }],
  "tailoredSkills": ["string"],
  "tailoredProjects": [{ "id": "string", "name": "string", "technologies": "string", "startDate": "string", "endDate": "string", "bullets": ["string"] }],
  "tailoredHobbies": ["string"],
  "coverLetterBody": "string"
}`;

  const userPrompt = `CANDIDATE PROFILE:
${JSON.stringify(
  {
    fullName: profile.fullName,
    summary: profile.summary,
    experience: profile.experience,
    education: profile.education,
    skills: profile.skills,
    projects: profile.projects,
    hobbies: profile.hobbies,
    certifications: profile.certifications,
  },
  null,
  2
)}

JOB DESCRIPTION:
Company: ${app.companyName}
Role: ${app.roleTitle}

${app.jobDescription}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TailorError("Empty AI response", 500);
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new TailorError("AI returned malformed output. Please try again.", 502);
  }

  const tailoredSummary = isSectionVisible(sectionConfig, "summary")
    ? ((result.tailoredSummary as string) ?? "")
    : "";
  const tailoredExperience = isSectionVisible(sectionConfig, "experience")
    ? limitBullets(result.tailoredExperience, MAX_EXPERIENCE_BULLETS)
    : [];
  const tailoredSkills = isSectionVisible(sectionConfig, "skills")
    ? limitTailoredSkills(
        Array.isArray(result.tailoredSkills) ? (result.tailoredSkills as string[]) : []
      )
    : [];
  const tailoredProjects = isSectionVisible(sectionConfig, "projects")
    ? (Array.isArray(result.tailoredProjects)
        ? limitBullets(result.tailoredProjects)
        : (profile.projects ?? []))
    : [];
  const tailoredHobbies = isSectionVisible(sectionConfig, "hobbies")
    ? (Array.isArray(result.tailoredHobbies) ? result.tailoredHobbies : (profile.hobbies ?? []))
    : [];

  await db
    .update(applications)
    .set({
      tailoredSummary,
      tailoredExperience,
      tailoredSkills,
      tailoredProjects,
      tailoredHobbies,
      coverLetterBody: (result.coverLetterBody as string) ?? "",
      status: "generated",
      sectionConfig,
      profileSnapshot: {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedin,
        github: profile.github,
        website: profile.website,
        education: profile.education,
        projects: profile.projects,
        hobbies: profile.hobbies,
      },
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  return {
    ...result,
    tailoredSummary,
    tailoredExperience,
    tailoredSkills,
    tailoredProjects,
    tailoredHobbies,
    sectionConfig,
  };
}
