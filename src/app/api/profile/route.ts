import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { masterProfileSchema, DEFAULT_SECTION_CONFIG } from "@/lib/types";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(masterProfiles)
    .where(eq(masterProfiles.userId, session.userId))
    .limit(1);

  if (rows.length === 0) {
    const id = uuid();
    const profile = {
      id,
      userId: session.userId,
      fullName: session.user?.name ?? "",
      email: session.user?.email ?? "",
      sectionConfig: DEFAULT_SECTION_CONFIG,
    };
    await db.insert(masterProfiles).values(profile);
    return NextResponse.json({
      ...profile,
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      website: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      hobbies: [],
      certifications: [],
      customSections: [],
      genericExperience: [],
      genericProjects: [],
    });
  }

  return NextResponse.json(rows[0]);
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = masterProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const rows = await db
    .select({ id: masterProfiles.id })
    .from(masterProfiles)
    .where(eq(masterProfiles.userId, session.userId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await db
    .update(masterProfiles)
    .set({
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
      genericExperience: data.genericExperience,
      genericProjects: data.genericProjects,
      updatedAt: new Date(),
    })
    .where(eq(masterProfiles.userId, session.userId));

  return NextResponse.json({ success: true });
}
