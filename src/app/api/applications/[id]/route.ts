import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { DEFAULT_SECTION_CONFIG } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, session.userId)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  await db
    .update(applications)
    .set({
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      jobDescription: body.jobDescription,
      status: body.status,
      tailoredSummary: body.tailoredSummary,
      tailoredExperience: body.tailoredExperience,
      tailoredSkills: body.tailoredSkills,
      tailoredProjects: body.tailoredProjects,
      tailoredHobbies: body.tailoredHobbies,
      coverLetterBody: body.coverLetterBody,
      sectionConfig: body.sectionConfig,
      updatedAt: new Date(),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, session.userId)));

  return NextResponse.json({ success: true });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [appRows, profileRows] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, session.userId)))
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
    return NextResponse.json({ error: "No profile found" }, { status: 400 });
  }

  const profile = profileRows[0];
  const profileConfig = profile.sectionConfig as unknown[] | null;
  const sectionConfig =
    Array.isArray(profileConfig) && profileConfig.length > 0
      ? profileConfig
      : DEFAULT_SECTION_CONFIG;

  const snapshot = {
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
  };

  await db
    .update(applications)
    .set({
      profileSnapshot: snapshot,
      sectionConfig,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, id));

  return NextResponse.json({ snapshot, sectionConfig });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, session.userId)));

  return NextResponse.json({ success: true });
}
