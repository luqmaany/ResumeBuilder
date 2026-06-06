import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchJobFromUrl } from "@/lib/job-fetch";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({
  url: z.string().min(1, "Job URL is required"),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const job = await fetchJobFromUrl(parsed.data.url);
    return NextResponse.json(job);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not fetch job from that URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
