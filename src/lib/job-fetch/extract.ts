import * as cheerio from "cheerio";

export interface ExtractedJob {
  companyName: string;
  roleTitle: string;
  jobDescription: string;
}

interface JsonLdJobPosting {
  title?: string;
  hiringOrganization?: { name?: string } | string;
  description?: string;
}

function stripHtml(value: string): string {
  return cheerio.load(value).text().replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseJsonLdJobPosting(raw: unknown): Partial<ExtractedJob> | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as JsonLdJobPosting;
  const roleTitle = typeof record.title === "string" ? record.title.trim() : "";
  let companyName = "";
  if (typeof record.hiringOrganization === "string") {
    companyName = record.hiringOrganization.trim();
  } else if (record.hiringOrganization && typeof record.hiringOrganization === "object") {
    companyName = record.hiringOrganization.name?.trim() ?? "";
  }

  const description =
    typeof record.description === "string" ? normalizeText(stripHtml(record.description)) : "";

  if (!roleTitle && !companyName && !description) return null;
  return { roleTitle, companyName, jobDescription: description };
}

function extractJsonLd($: cheerio.CheerioAPI): Partial<ExtractedJob> | null {
  const scripts = $('script[type="application/ld+json"]');
  for (const element of scripts.toArray()) {
    const raw = $(element).html()?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (
          candidate &&
          typeof candidate === "object" &&
          (candidate as { "@type"?: string })["@type"] === "JobPosting"
        ) {
          const result = parseJsonLdJobPosting(candidate);
          if (result?.jobDescription || result?.roleTitle) return result;
        }

        if (
          candidate &&
          typeof candidate === "object" &&
          Array.isArray((candidate as { "@graph"?: unknown[] })["@graph"])
        ) {
          for (const node of (candidate as { "@graph": unknown[] })["@graph"]) {
            if (
              node &&
              typeof node === "object" &&
              (node as { "@type"?: string })["@type"] === "JobPosting"
            ) {
              const result = parseJsonLdJobPosting(node);
              if (result?.jobDescription || result?.roleTitle) return result;
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return null;
}

function extractIndeed($: cheerio.CheerioAPI): Partial<ExtractedJob> | null {
  const roleTitle =
    $('h1[data-testid="jobsearch-JobInfoHeader-title"]').first().text().trim() ||
    $('h1.jobsearch-JobInfoHeader-title').first().text().trim() ||
    $('h1[class*="JobInfoHeader"]').first().text().trim();

  const companyName =
    $('[data-testid="inlineHeader-companyName"]').first().text().trim() ||
    $('div[data-company-name="true"]').first().text().trim() ||
    $('div.jobsearch-InlineCompanyRating a').first().text().trim();

  const description =
    $("#jobDescriptionText").text().trim() ||
    $('[data-testid="job-description"]').text().trim() ||
    $('div[id*="jobDescription"]').first().text().trim();

  if (!roleTitle && !companyName && !description) return null;
  return {
    roleTitle,
    companyName,
    jobDescription: normalizeText(description),
  };
}

function extractSeek($: cheerio.CheerioAPI): Partial<ExtractedJob> | null {
  const roleTitle =
    $('h1[data-automation="job-detail-title"]').first().text().trim() ||
    $('h1[data-automation="jobTitle"]').first().text().trim() ||
    $('h1[class*="jobTitle"]').first().text().trim();

  const companyName =
    $('[data-automation="advertiser-name"]').first().text().trim() ||
    $('span[data-automation="jobCompany"]').first().text().trim() ||
    $('a[data-automation="jobCompany"]').first().text().trim();

  const description =
    $('[data-automation="jobAdDetails"]').text().trim() ||
    $('[data-automation="jobDescription"]').text().trim() ||
    $('div[class*="jobDescription"]').first().text().trim();

  if (!roleTitle && !companyName && !description) return null;
  return {
    roleTitle,
    companyName,
    jobDescription: normalizeText(description),
  };
}

function extractMeta($: cheerio.CheerioAPI): Partial<ExtractedJob> | null {
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const description =
    $('meta[name="description"]').attr("content")?.trim() ??
    $('meta[property="description"]').attr("content")?.trim() ??
    "";

  let roleTitle = ogTitle;
  let companyName = "";

  const titleParts = ogTitle.split(/\s[-|–—]\s/);
  if (titleParts.length >= 2) {
    roleTitle = titleParts[0]?.trim() ?? ogTitle;
    companyName = titleParts[titleParts.length - 1]?.trim() ?? "";
  }

  const pageTitle = $("title").first().text().trim();
  if (!roleTitle && pageTitle) {
    const parts = pageTitle.split(/\s[-|–—]\s/);
    roleTitle = parts[0]?.trim() ?? pageTitle;
    if (!companyName && parts.length >= 2) {
      companyName = parts[parts.length - 1]?.replace(/\s*\|.*/, "").trim() ?? "";
    }
  }

  const jobDescription = normalizeText(ogDescription || description);
  if (!roleTitle && !companyName && !jobDescription) return null;
  return { roleTitle, companyName, jobDescription };
}

function extractGeneric($: cheerio.CheerioAPI): Partial<ExtractedJob> | null {
  $("script, style, nav, header, footer, noscript, iframe, svg").remove();

  const mainText =
    $("main").text().trim() ||
    $('article[data-testid="job-description"]').text().trim() ||
    $('[class*="job-description"]').first().text().trim() ||
    $('[class*="JobDescription"]').first().text().trim() ||
    $("article").first().text().trim() ||
    $("body").text().trim();

  const jobDescription = normalizeText(mainText);
  if (jobDescription.length < 120) return null;
  return { jobDescription: jobDescription.slice(0, 12_000) };
}

function mergeExtracted(...parts: Array<Partial<ExtractedJob> | null>): ExtractedJob {
  const merged: ExtractedJob = {
    companyName: "",
    roleTitle: "",
    jobDescription: "",
  };

  for (const part of parts) {
    if (!part) continue;
    if (!merged.companyName && part.companyName) merged.companyName = part.companyName;
    if (!merged.roleTitle && part.roleTitle) merged.roleTitle = part.roleTitle;
    if (
      !merged.jobDescription ||
      (part.jobDescription && part.jobDescription.length > merged.jobDescription.length)
    ) {
      merged.jobDescription = part.jobDescription ?? merged.jobDescription;
    }
  }

  return merged;
}

export function extractJobFromHtml(html: string, sourceUrl: string): ExtractedJob {
  const $ = cheerio.load(html);
  const hostname = new URL(sourceUrl).hostname.toLowerCase();

  const siteSpecific =
    hostname.includes("indeed.") ? extractIndeed($) :
    hostname.includes("seek.") ? extractSeek($) :
    null;

  const fresh$ = cheerio.load(html);
  return mergeExtracted(
    extractJsonLd(fresh$),
    siteSpecific,
    extractMeta(cheerio.load(html)),
    extractGeneric(cheerio.load(html))
  );
}
