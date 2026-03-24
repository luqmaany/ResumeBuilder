import { NextResponse } from "next/server";
import { db } from "@/db";
import { googleSheetsConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { encrypt } from "@/lib/encryption";
import { v4 as uuid } from "uuid";
import { clerkClient } from "@clerk/nextjs/server";
import { getTokensForUser, appendRow } from "@/lib/google-sheets";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: googleSheetsConnections.id,
      spreadsheetId: googleSheetsConnections.spreadsheetId,
      sheetName: googleSheetsConnections.sheetName,
    })
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.userId, session.userId))
    .limit(1);

  return NextResponse.json(rows[0] ?? null);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { spreadsheetId, sheetName } = body;
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId required" }, { status: 400 });
  }

  // Get the Google OAuth token from Clerk
  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(session.userId, "google");
  const token = tokens.data[0]?.token;

  if (!token) {
    return NextResponse.json(
      { error: "No Google token found. Make sure you signed in with Google." },
      { status: 400 }
    );
  }

  const encrypted = encrypt(token);

  // Upsert
  const existing = await db
    .select({ id: googleSheetsConnections.id })
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.userId, session.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(googleSheetsConnections)
      .set({
        spreadsheetId,
        sheetName: sheetName || "Applications",
        refreshTokenEncrypted: encrypted,
        accessToken: null,
        tokenExpiresAt: null,
      })
      .where(eq(googleSheetsConnections.userId, session.userId));
  } else {
    await db.insert(googleSheetsConnections).values({
      id: uuid(),
      userId: session.userId,
      spreadsheetId,
      sheetName: sheetName || "Applications",
      refreshTokenEncrypted: encrypted,
    });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { companyName, roleTitle, status: appStatus, applicationId } = body;

  const tokenInfo = await getTokensForUser(session.userId);
  if (!tokenInfo) {
    return NextResponse.json(
      { error: "Google Sheets not connected. Go to Settings." },
      { status: 400 }
    );
  }

  const today = new Date().toLocaleDateString("en-US");
  await appendRow(tokenInfo, [today, companyName, roleTitle, appStatus, applicationId]);

  return NextResponse.json({ success: true });
}
