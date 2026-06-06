import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { fetchJobFromUrl } from "@/lib/job-fetch";
import { getSessionUser } from "@/lib/session";
import { tailorApplication, TailorError } from "@/lib/tailor-application";
import { DEFAULT_SECTION_CONFIG } from "@/lib/types";

const bodySchema = z.object({
  url: z.string().min(1, "Job URL is required"),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profileRows = await db
    .select({ sectionConfig: masterProfiles.sectionConfig })
    .from(masterProfiles)
    .where(eq(masterProfiles.userId, session.userId))
    .limit(1);

  if (profileRows.length === 0) {
    return NextResponse.json(
      { error: "Please fill in your profile before importing a job" },
      { status: 400 }
    );
  }

  let job;
  try {
    job = await fetchJobFromUrl(parsed.data.url);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not fetch job from that URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const profileConfig = profileRows[0]?.sectionConfig as unknown[] | null;
  const sectionConfig =
    Array.isArray(profileConfig) && profileConfig.length > 0
      ? profileConfig
      : DEFAULT_SECTION_CONFIG;

  const id = uuid();
  const now = new Date();

  await db.insert(applications).values({
    id,
    userId: session.userId,
    companyName: job.companyName,
    roleTitle: job.roleTitle,
    jobDescription: job.jobDescription,
    jobUrl: job.sourceUrl,
    status: "draft",
    sectionConfig,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const tailored = await tailorApplication(id, session.userId);
    return NextResponse.json({
      id,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
      jobDescription: job.jobDescription,
      jobUrl: job.sourceUrl,
      status: "generated",
      ...tailored,
    });
  } catch (err: unknown) {
    if (err instanceof TailorError) {
      return NextResponse.json(
        {
          id,
          error: err.message,
          companyName: job.companyName,
          roleTitle: job.roleTitle,
          jobDescription: job.jobDescription,
          jobUrl: job.sourceUrl,
        },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json(
      {
        id,
        error: message,
        companyName: job.companyName,
        roleTitle: job.roleTitle,
        jobDescription: job.jobDescription,
        jobUrl: job.sourceUrl,
      },
      { status: 500 }
    );
  }
}
