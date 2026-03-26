import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { renderToBuffer } from "@react-pdf/renderer";
import { CoverLetterDocument } from "@/lib/pdf/cover-template";
import React from "react";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

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

  const app = appRows[0];
  const profile = profileRows[0];
  const snapshot = (app.profileSnapshot ?? {}) as Record<string, unknown>;

  const data = {
    fullName: (snapshot.fullName as string) ?? profile?.fullName ?? "",
    email: (snapshot.email as string) ?? profile?.email ?? "",
    phone: (snapshot.phone as string) ?? profile?.phone ?? "",
    location: (snapshot.location as string) ?? profile?.location ?? "",
    linkedin: (snapshot.linkedin as string) ?? profile?.linkedin ?? "",
    github: (snapshot.github as string) ?? profile?.github ?? "",
    website: (snapshot.website as string) ?? profile?.website ?? "",
    companyName: app.companyName,
    roleTitle: app.roleTitle,
    coverLetterBody: app.coverLetterBody,
  };

  const buffer = await renderToBuffer(<CoverLetterDocument data={data} />);
  const uint8 = new Uint8Array(buffer);

  const preview = searchParams.get("preview") === "1";
  const disposition = preview
    ? `inline; filename="${app.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_CoverLetter.pdf"`
    : `attachment; filename="${app.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_CoverLetter.pdf"`;

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
