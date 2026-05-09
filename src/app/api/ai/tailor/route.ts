import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await request.json();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const [appRows, profileRows] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, session.userId)))
      .limit(1),
    db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, session.userId))
      .limit(1),
  ]);

  if (appRows.length === 0) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (profileRows.length === 0) {
    return NextResponse.json({ error: "Please fill in your profile first" }, { status: 400 });
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
2. A curated selection of the candidate's most relevant work experiences for this role. Strongly prefer experiences where the candidate used languages or technologies from the required tech stack. Omit roles that add little value for this specific position. For each selected experience, output exactly 3 bullet points (no fewer, no more). Rewrite those bullets to explicitly name the relevant languages and technologies used (e.g. "Built REST APIs in Python/FastAPI" rather than just "Built REST APIs") where the original bullets support it; combine or distill multiple source bullets into 3 strongest lines — never introduce new duties or achievements not grounded in the original role. Keep the same employers, titles, and dates — NEVER invent or change factual information. Include at least 1 experience and no more than the top 4-5 most relevant roles.
3. A curated list of skills most relevant to the job description. Place languages and technologies from the required tech stack that the candidate actually has at the top, ordered by how prominently they appear in the job description.
4. A curated selection of the candidate's most relevant projects for this role. Strongly prefer projects that used languages or technologies from the required tech stack. Omit projects that are not relevant. For each selected project, rewrite bullets to explicitly call out the relevant languages/technologies used. Keep the same project names, technologies, and dates — NEVER invent projects. Include at most the top 3-4 most relevant projects.
5. A tailored list of hobbies and interests most relevant to the role and company culture. Reorder by relevance and keep only genuine hobbies from the candidate's list — NEVER invent hobbies.
6. A professional cover letter body (3-4 paragraphs, no addresses/headers — the template handles formatting). The letter should reference the specific company, role title, and 2-3 languages or technologies from the required tech stack that the candidate has.

CRITICAL RULES:
- Each object in tailoredExperience must include exactly 3 strings in its "bullets" array.
- NEVER invent employers, job titles, dates, degrees, certifications, or projects.
- NEVER add experience or projects the candidate doesn't have.
- NEVER claim the candidate knows a language or technology that does not appear anywhere in their profile.
- Keep original date ranges exactly as provided.
- Quantify achievements where the original bullets support it.
- Use strong action verbs.
- Optimize for ATS keyword matching without keyword stuffing.
- Only include experiences and projects from the candidate's actual profile — select the most relevant subset, do not include all of them if some are not relevant.
- If the candidate has no projects, return an empty array for tailoredProjects.
- If the candidate has no hobbies, return an empty array for tailoredHobbies.

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
${JSON.stringify({
  fullName: profile.fullName,
  summary: profile.summary,
  experience: profile.experience,
  education: profile.education,
  skills: profile.skills,
  projects: profile.projects,
  hobbies: profile.hobbies,
  certifications: profile.certifications,
}, null, 2)}

JOB DESCRIPTION:
Company: ${app.companyName}
Role: ${app.roleTitle}

${app.jobDescription}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const result = JSON.parse(content);

    const profileConfig = profile.sectionConfig as unknown[] | null;
    const sectionConfig =
      Array.isArray(profileConfig) && profileConfig.length > 0
        ? profileConfig
        : undefined;

    await db
      .update(applications)
      .set({
        tailoredSummary: result.tailoredSummary ?? "",
        tailoredExperience: result.tailoredExperience ?? [],
        tailoredSkills: result.tailoredSkills ?? [],
        tailoredProjects: result.tailoredProjects ?? profile.projects ?? [],
        tailoredHobbies: result.tailoredHobbies ?? profile.hobbies ?? [],
        coverLetterBody: result.coverLetterBody ?? "",
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

    return NextResponse.json({
      ...result,
      ...(sectionConfig ? { sectionConfig } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
