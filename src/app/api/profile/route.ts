import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { masterProfileSchema, DEFAULT_SECTION_CONFIG } from "@/lib/types";
import { fetchMasterProfile, saveMasterProfile } from "@/lib/profile-db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profile = await fetchMasterProfile(session.userId);

    if (!profile) {
      const id = uuid();
      const newProfile = {
        id,
        userId: session.userId,
        fullName: session.user?.name ?? "",
        email: session.user?.email ?? "",
        sectionConfig: DEFAULT_SECTION_CONFIG,
      };
      await db.insert(masterProfiles).values(newProfile);
      return NextResponse.json({
        ...newProfile,
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

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/profile failed:", error);
    return NextResponse.json(
      { error: "Failed to load profile. Check database connection and migrations." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = masterProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await fetchMasterProfile(session.userId);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const result = await saveMasterProfile(session.userId, parsed.data);

    return NextResponse.json({
      success: true,
      genericResumePersisted: result.genericResumePersisted,
    });
  } catch (error) {
    console.error("PUT /api/profile failed:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
