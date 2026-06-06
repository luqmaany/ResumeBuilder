import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { applicationSchema, DEFAULT_SECTION_CONFIG } from "@/lib/types";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, session.userId))
    .orderBy(desc(applications.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profileRows = await db
    .select({ sectionConfig: masterProfiles.sectionConfig })
    .from(masterProfiles)
    .where(eq(masterProfiles.userId, session.userId))
    .limit(1);

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
    companyName: parsed.data.companyName,
    roleTitle: parsed.data.roleTitle,
    jobDescription: parsed.data.jobDescription,
    jobUrl: parsed.data.jobUrl,
    status: parsed.data.status,
    sectionConfig,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id });
}
