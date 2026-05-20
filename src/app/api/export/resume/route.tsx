import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, masterProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/pdf/resume-template";
import {
  buildResumeDataFromApplication,
  resumePdfFilename,
} from "@/lib/pdf/build-resume-data";
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
  const data = buildResumeDataFromApplication(app, profile);

  // @ts-expect-error react-pdf types are loose with jsonb data
  const buffer = await renderToBuffer(<ResumeDocument data={data} />);
  return { buffer: new Uint8Array(buffer), filename: resumePdfFilename(app.companyName) };
}

export async function GET(request: Request) {
  const result = await buildResumeBuffer(request);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";

  const disposition = preview
    ? `inline; filename="${result.filename}"`
    : `attachment; filename="${result.filename}"`;

  return new NextResponse(result.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
