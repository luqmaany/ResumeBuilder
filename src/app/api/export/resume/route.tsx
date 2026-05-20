import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/pdf/resume-template";
import { isSectionVisible, limitTailoredSkills, normalizeSectionConfig } from "@/lib/types";
import React from "react";

async function buildResumeBuffer(request: Request) {
  const session = await getSessionUser();
  if (!session) return { error: "Unauthorized", status: 401 };

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return { error: "id required", status: 400 };

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

  if (appRows.length === 0) return { error: "Application not found", status: 404 };

  const app = appRows[0];
  const profile = profileRows[0];
  const snapshot = (app.profileSnapshot ?? {}) as Record<string, unknown>;

  const sectionConfig = normalizeSectionConfig(
    app.sectionConfig as Parameters<typeof normalizeSectionConfig>[0]
  );
  const projectsVisible = isSectionVisible(sectionConfig, "projects");
  const tailoredProjects = app.tailoredProjects as unknown[];

  const data = {
    fullName: (snapshot.fullName as string) ?? profile?.fullName ?? "",
    email: (snapshot.email as string) ?? profile?.email ?? "",
    phone: (snapshot.phone as string) ?? profile?.phone ?? "",
    location: (snapshot.location as string) ?? profile?.location ?? "",
    linkedin: (snapshot.linkedin as string) ?? profile?.linkedin ?? "",
    github: (snapshot.github as string) ?? profile?.github ?? "",
    website: (snapshot.website as string) ?? profile?.website ?? "",
    summary: app.tailoredSummary || profile?.summary || "",
    experience: (app.tailoredExperience as unknown[]) ?? [],
    education: ((snapshot.education ?? profile?.education ?? []) as unknown[]),
    skills: limitTailoredSkills((app.tailoredSkills as string[]) ?? []),
    hobbies: ((app.tailoredHobbies as string[])?.length
      ? app.tailoredHobbies
      : (snapshot.hobbies ?? profile?.hobbies ?? [])) as string[],
    projects: !projectsVisible
      ? []
      : ((tailoredProjects?.length
          ? tailoredProjects
          : (snapshot.projects ?? profile?.projects ?? [])) as unknown[]),
    sectionConfig,
  };

  // @ts-expect-error react-pdf types are loose with jsonb data
  const buffer = await renderToBuffer(<ResumeDocument data={data} />);
  return { buffer: new Uint8Array(buffer), companyName: app.companyName };
}

export async function GET(request: Request) {
  const result = await buildResumeBuffer(request);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";

  const disposition = preview
    ? `inline; filename="${result.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_Resume.pdf"`
    : `attachment; filename="${result.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_Resume.pdf"`;

  return new NextResponse(result.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
