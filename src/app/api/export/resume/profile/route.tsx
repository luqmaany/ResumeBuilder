import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/pdf/resume-template";
import {
  buildResumeDataFromProfile,
  resumePdfFilename,
} from "@/lib/pdf/build-resume-data";
import { fetchMasterProfile } from "@/lib/profile-db";
import React from "react";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await fetchMasterProfile(session.userId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const data = buildResumeDataFromProfile(profile);

  // @ts-expect-error react-pdf types are loose with jsonb data
  const buffer = await renderToBuffer(<ResumeDocument data={data} />);

  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";
  const filename = resumePdfFilename(String(profile.fullName ?? "Resume"));
  const disposition = preview
    ? `inline; filename="${filename}"`
    : `attachment; filename="${filename}"`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
