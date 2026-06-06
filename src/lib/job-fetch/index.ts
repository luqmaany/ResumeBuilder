import OpenAI from "openai";
import { extractJobFromHtml } from "./extract";
import { fetchJobPage, validateJobUrl } from "./fetch-page";

export interface JobFetchResult {
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  sourceUrl: string;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function needsAiCleanup(job: JobFetchResult): boolean {
  return (
    job.jobDescription.length < 120 ||
    !job.companyName ||
    !job.roleTitle
  );
}

async function cleanupWithAi(rawText: string, sourceUrl: string): Promise<Partial<JobFetchResult>> {
  if (!openai) return {};

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract job posting details from noisy web page text.
Return JSON with:
- companyName: employer name
- roleTitle: job title
- jobDescription: clean full job description text (requirements, responsibilities, etc.)

Use only information present in the text. If a field is missing, use an empty string.`,
      },
      {
        role: "user",
        content: `Source URL: ${sourceUrl}

PAGE TEXT:
${rawText.slice(0, 20_000)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return {};

  try {
    const parsed = JSON.parse(content) as Partial<JobFetchResult>;
    return {
      companyName: typeof parsed.companyName === "string" ? parsed.companyName.trim() : "",
      roleTitle: typeof parsed.roleTitle === "string" ? parsed.roleTitle.trim() : "",
      jobDescription:
        typeof parsed.jobDescription === "string" ? parsed.jobDescription.trim() : "",
    };
  } catch {
    return {};
  }
}

export async function fetchJobFromUrl(rawUrl: string): Promise<JobFetchResult> {
  const url = validateJobUrl(rawUrl);
  const html = await fetchJobPage(url);
  const extracted = extractJobFromHtml(html, url.toString());

  let result: JobFetchResult = {
    companyName: extracted.companyName,
    roleTitle: extracted.roleTitle,
    jobDescription: extracted.jobDescription,
    sourceUrl: url.toString(),
  };

  if (needsAiCleanup(result)) {
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const aiResult = await cleanupWithAi(plainText, url.toString());
    result = {
      sourceUrl: url.toString(),
      companyName: result.companyName || aiResult.companyName || "",
      roleTitle: result.roleTitle || aiResult.roleTitle || "",
      jobDescription: result.jobDescription || aiResult.jobDescription || "",
    };
  }

  if (result.jobDescription.length < 80) {
    throw new Error(
      "Could not read enough job description from that link. Try pasting the description manually."
    );
  }

  if (!result.companyName) {
    result.companyName = "Unknown Company";
  }
  if (!result.roleTitle) {
    result.roleTitle = "Role from job posting";
  }

  return result;
}
