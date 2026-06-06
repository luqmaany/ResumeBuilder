import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { tailorApplication, TailorError } from "@/lib/tailor-application";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await request.json();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  try {
    const result = await tailorApplication(applicationId, session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof TailorError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
