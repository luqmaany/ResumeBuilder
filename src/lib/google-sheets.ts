import { db } from "@/db";
import { googleSheetsConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  spreadsheetId: string;
  sheetName: string;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to refresh token");
  return data.access_token;
}

export async function getTokensForUser(userId: string): Promise<TokenInfo | null> {
  const rows = await db
    .select()
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;

  const conn = rows[0];
  const refreshToken = decrypt(conn.refreshTokenEncrypted);

  let accessToken = conn.accessToken;
  const expired = !conn.tokenExpiresAt || conn.tokenExpiresAt < new Date();

  if (!accessToken || expired) {
    accessToken = await refreshAccessToken(refreshToken);
    await db
      .update(googleSheetsConnections)
      .set({
        accessToken,
        tokenExpiresAt: new Date(Date.now() + 3500 * 1000),
      })
      .where(eq(googleSheetsConnections.id, conn.id));
  }

  return {
    accessToken,
    refreshToken,
    spreadsheetId: conn.spreadsheetId,
    sheetName: conn.sheetName,
  };
}

export async function appendRow(
  tokenInfo: TokenInfo,
  values: string[]
): Promise<void> {
  const range = `${tokenInfo.sheetName}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${tokenInfo.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenInfo.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error: ${err}`);
  }
}
