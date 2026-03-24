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

1. A tailored professional summary (2-3 sentences) that highlights the candidate's most relevant strengths for this specific role.
2. Tailored experience bullet points for each role in the candidate's experience. Rewrite existing bullets to emphasize skills and achievements that match the job description. Keep the same employers, titles, and dates — NEVER invent or change factual information.
3. A curated list of skills most relevant to the job description (reorder by relevance, include all that apply).
4. Tailored project descriptions for each project in the candidate's profile. Rewrite bullets to emphasize relevance to the job description. Keep the same project names, technologies, and dates — NEVER invent projects.
5. A tailored list of hobbies and interests most relevant to the role and company culture. Reorder by relevance and keep only genuine hobbies from the candidate's list — NEVER invent hobbies.
6. A professional cover letter body (3-4 paragraphs, no addresses/headers — the template handles formatting). The letter should reference the specific company and role title.

CRITICAL RULES:
- NEVER invent employers, job titles, dates, degrees, certifications, or projects.
- NEVER add experience or projects the candidate doesn't have.
- Keep original date ranges exactly as provided.
- Quantify achievements where the original bullets support it.
- Use strong action verbs.
- Optimize for ATS keyword matching without keyword stuffing.
- If the candidate has no projects, return an empty array for tailoredProjects.
- If the candidate has no hobbies, return an empty array for tailoredHobbies.

Respond ONLY with valid JSON matching this schema:
{
  "tailoredSummary": "string",
  "tailoredExperience": [{ "id": "string", "company": "string", "title": "string", "location": "string", "startDate": "string", "endDate": "string", "bullets": ["string"] }],
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
      model: "gpt-4o-mini",
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
