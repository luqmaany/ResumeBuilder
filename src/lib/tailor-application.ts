import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { limitTailoredSkills, MAX_TAILORED_SKILLS } from "@/lib/types";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const systemPrompt = `You are a professional resume writer. Given the candidate's master profile and a job description, produce:

Before producing output, scan the job description and extract:
- Every programming language explicitly mentioned (e.g. Python, TypeScript, Go, Java, Rust, SQL, etc.)
- Every framework, library, and tool mentioned (e.g. React, Node.js, Django, Kubernetes, etc.)
Call this the "required tech stack".

Then produce:

1. A tailored professional summary (2-3 sentences) that highlights the candidate's most relevant strengths for this specific role. Naturally mention 1-2 languages or technologies from the required tech stack that the candidate actually has.
2. A curated selection of the candidate's most relevant work experiences for this role. Strongly prefer experiences where the candidate used languages or technologies from the required tech stack. Omit roles that add little value for this specific position. For each selected experience, output exactly 3 bullet points (no fewer, no more). Write every bullet using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]" — i.e. lead with a strong action verb, state the impact/result (X), back it with a concrete metric (Y, e.g. %, $, time saved, scale/volume), and name the action or method used (Z), including the relevant languages and technologies (e.g. "Cut API response time by 40% by refactoring the data layer in Python/FastAPI" rather than just "Built REST APIs"). Prefer real numbers from the original bullets, but where none exist, add a reasonable, modest estimate to quantify the impact (the Y) — e.g. percentages, dollar figures, time saved, or scale/volume (use approximations like "~", "approximately", or ranges such as "20-30%"). Keep estimates conservative and defensible so the candidate can stand behind them in an interview; never invent extreme or implausible figures, and don't attach numbers to bullets where a metric would not make sense. Combine or distill multiple source bullets into 3 strongest lines — never introduce new duties or achievements not grounded in the original role. Keep the same employers, titles, and dates — NEVER invent or change factual information. Include at least 1 experience and no more than the top 4-5 most relevant roles.
3. Exactly ${MAX_TAILORED_SKILLS} skills (no more) most relevant to the job description — the single best subset for this role. Place languages and technologies from the required tech stack that the candidate actually has at the top, ordered by how prominently they appear in the job description. Omit lower-priority skills even if the candidate has many.
4. A curated selection of the candidate's most relevant projects for this role. Strongly prefer projects that used languages or technologies from the required tech stack. Omit projects that are not relevant. For each selected project, rewrite bullets using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]" — lead with an action verb, state the impact (X), back it with a concrete metric (Y) — using a real number where the source supports it, otherwise a reasonable, conservative estimate such as a percentage, figure, or scale (e.g. "~", "approximately", or a range) — and name the action and relevant languages/technologies used (Z). Keep any estimated numbers modest and defensible; never invent extreme or implausible figures. Keep the same project names, technologies, and dates — NEVER invent projects. Include at most the top 3-4 most relevant projects.
5. A tailored list of hobbies and interests most relevant to the role and company culture. Reorder by relevance and keep only genuine hobbies from the candidate's list — NEVER invent hobbies.
6. A professional cover letter body (3-4 paragraphs, no addresses/headers — the template handles formatting). The letter should reference the specific company, role title, and 2-3 languages or technologies from the required tech stack that the candidate has.

CRITICAL RULES:
- Each object in tailoredExperience must include exactly 3 strings in its "bullets" array.
- NEVER invent employers, job titles, dates, degrees, certifications, or projects.
- NEVER add experience or projects the candidate doesn't have.
- NEVER claim the candidate knows a language or technology that does not appear anywhere in their profile.
- Keep original date ranges exactly as provided.
- Write every experience and project bullet using the XYZ formula: accomplished [X] as measured by [Y], by doing [Z].
- Quantify achievements (the Y) with numbers wherever it makes sense — use real figures when the source provides them, otherwise add reasonable, conservative estimates (percentages, dollar amounts, time saved, scale/volume) using approximations or ranges; keep them modest and defensible, never extreme or implausible.
- Start each bullet with a strong action verb.
- Optimize for ATS keyword matching without keyword stuffing.
- Only include experiences and projects from the candidate's actual profile — select the most relevant subset, do not include all of them if some are not relevant.
- If the candidate has no projects, return an empty array for tailoredProjects.
- If the candidate has no hobbies, return an empty array for tailoredHobbies.
- tailoredSkills must contain at most ${MAX_TAILORED_SKILLS} items, ordered from most to least relevant for this job.

Respond ONLY with valid JSON matching this schema:
{
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
    model: "gpt-5.4-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TailorError("Empty AI response", 500);
  }

  const result = JSON.parse(content) as Record<string, unknown>;
  const tailoredSkills = limitTailoredSkills(
    Array.isArray(result.tailoredSkills) ? (result.tailoredSkills as string[]) : []
  );

  const profileConfig = profile.sectionConfig as unknown[] | null;
  const sectionConfig =
    Array.isArray(profileConfig) && profileConfig.length > 0 ? profileConfig : undefined;

  await db
    .update(applications)
    .set({
      tailoredSummary: (result.tailoredSummary as string) ?? "",
      tailoredExperience: result.tailoredExperience ?? [],
      tailoredSkills,
      tailoredProjects: result.tailoredProjects ?? profile.projects ?? [],
      tailoredHobbies: result.tailoredHobbies ?? profile.hobbies ?? [],
      coverLetterBody: (result.coverLetterBody as string) ?? "",
      status: "generated",
      ...(sectionConfig ? { sectionConfig } : {}),
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
    tailoredSkills,
    ...(sectionConfig ? { sectionConfig } : {}),
  };
}
