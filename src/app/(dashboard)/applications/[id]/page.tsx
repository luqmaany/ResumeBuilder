"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ExperienceItem } from "@/lib/types";

interface ApplicationData {
  id: string;
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  status: string;
  tailoredSummary: string;
  tailoredExperience: ExperienceItem[];
  tailoredSkills: string[];
  tailoredProjects: { id: string; name: string; technologies?: string; startDate?: string; endDate?: string; bullets: string[] }[];
  tailoredHobbies: string[];
  coverLetterBody: string;
  sectionConfig: { id: string; type: string; title: string; visible: boolean; order: number }[];
}

const STATUSES = ["draft", "generated", "applied", "interview", "offer", "rejected"];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setApp({
          ...data,
          tailoredExperience: Array.isArray(data.tailoredExperience) ? data.tailoredExperience : [],
          tailoredSkills: Array.isArray(data.tailoredSkills) ? data.tailoredSkills : [],
          tailoredProjects: Array.isArray(data.tailoredProjects) ? data.tailoredProjects : [],
          tailoredHobbies: Array.isArray(data.tailoredHobbies) ? data.tailoredHobbies : [],
          sectionConfig: Array.isArray(data.sectionConfig) ? data.sectionConfig : [],
        });
      });
  }, [id]);

  const save = useCallback(async () => {
    if (!app) return;
    setSaving(true);
    setStatus("");
    const res = await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app),
    });
    setSaving(false);
    setStatus(res.ok ? "Saved!" : "Error saving");
  }, [app, id]);

  const generate = async () => {
    if (!app) return;
    setGenerating(true);
    setStatus("");
    const res = await fetch("/api/ai/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      setApp((prev) =>
        prev
          ? {
              ...prev,
              tailoredSummary: data.tailoredSummary ?? prev.tailoredSummary,
              tailoredExperience: data.tailoredExperience ?? prev.tailoredExperience,
              tailoredSkills: data.tailoredSkills ?? prev.tailoredSkills,
              tailoredProjects: data.tailoredProjects ?? prev.tailoredProjects,
              tailoredHobbies: data.tailoredHobbies ?? prev.tailoredHobbies,
              coverLetterBody: data.coverLetterBody ?? prev.coverLetterBody,
              sectionConfig: data.sectionConfig ?? prev.sectionConfig,
              status: "generated",
            }
          : prev
      );
      setStatus("Generated! Review the tailored content below.");
    } else {
      const err = await res.json();
      setStatus("Error: " + (err.error ?? "Generation failed"));
    }
    setGenerating(false);
  };

  const syncProfile = async () => {
    setStatus("");
    const res = await fetch(`/api/applications/${id}`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      setApp((prev) =>
        prev ? { ...prev, sectionConfig: data.sectionConfig } : prev
      );
      setStatus("Profile synced! Contact info, education, projects & section order updated.");
    } else {
      const err = await res.json();
      setStatus("Error: " + (err.error ?? "Sync failed"));
    }
  };

  const deleteApp = async () => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    router.push("/applications");
  };

  const downloadResume = () => {
    window.open(`/api/export/resume?id=${id}`, "_blank");
  };

  const previewResume = () => {
    window.open(`/api/export/resume?id=${id}&preview=1`, "_blank");
  };

  const downloadCover = () => {
    window.open(`/api/export/cover?id=${id}`, "_blank");
  };

  const logToSheet = async () => {
    if (!app) return;
    setStatus("");
    const res = await fetch("/api/google/sheets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: app.companyName,
        roleTitle: app.roleTitle,
        status: app.status,
        applicationId: id,
      }),
    });
    if (res.ok) {
      setStatus("Logged to Google Sheet!");
    } else {
      const data = await res.json();
      setStatus("Error: " + (data.error ?? "Failed to log"));
    }
  };

  if (!app) {
    return <div className="text-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {app.roleTitle} @ {app.companyName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <select
              className="text-sm border rounded px-2 py-1"
              value={app.status}
              onChange={(e) => setApp({ ...app, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncProfile}
            className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Sync Profile
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating..." : "AI Generate"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={deleteApp}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {status && (
        <p className={`text-sm ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {status}
        </p>
      )}

      {/* Export buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={previewResume}
          className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Preview Resume
        </button>
        <button
          onClick={downloadResume}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Download Resume PDF
        </button>
        <button
          onClick={downloadCover}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Download Cover Letter PDF
        </button>
        <button
          onClick={logToSheet}
          className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
        >
          Log to Google Sheet
        </button>
      </div>

      {/* Job Description */}
      <section className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-semibold">Job Description</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={app.jobDescription}
          onChange={(e) => setApp({ ...app, jobDescription: e.target.value })}
        />
      </section>

      {/* Tailored Summary */}
      <section className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-semibold">Tailored Summary</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={app.tailoredSummary}
          onChange={(e) => setApp({ ...app, tailoredSummary: e.target.value })}
          placeholder="AI-generated summary will appear here, or write your own..."
        />
      </section>

      {/* Tailored Experience */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tailored Experience</h2>
        {app.tailoredExperience.length === 0 && (
          <p className="text-sm text-gray-400">
            Click &ldquo;AI Generate&rdquo; to create tailored bullet points.
          </p>
        )}
        {app.tailoredExperience.map((exp, i) => (
          <div key={exp.id || i} className="border rounded-lg p-4 space-y-2 bg-gray-50">
            <p className="font-medium text-sm">
              {exp.title} &mdash; {exp.company}
            </p>
            {exp.bullets.map((b, j) => (
              <div key={j} className="flex gap-2">
                <span className="text-gray-400 mt-2">-</span>
                <textarea
                  className="flex-1 border rounded-lg px-3 py-2 text-sm min-h-[40px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={b}
                  onChange={(e) => {
                    const copy = [...app.tailoredExperience];
                    copy[i] = {
                      ...copy[i],
                      bullets: copy[i].bullets.map((x, k) => (k === j ? e.target.value : x)),
                    };
                    setApp({ ...app, tailoredExperience: copy });
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Tailored Skills */}
      <section className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-semibold">Tailored Skills</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={app.tailoredSkills.join(", ")}
          onChange={(e) =>
            setApp({
              ...app,
              tailoredSkills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="Comma-separated skills..."
        />
      </section>

      {/* Tailored Projects */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tailored Projects</h2>
        {app.tailoredProjects.length === 0 && (
          <p className="text-sm text-gray-400">
            Click &ldquo;AI Generate&rdquo; to create tailored project descriptions.
          </p>
        )}
        {app.tailoredProjects.map((proj, i) => (
          <div key={proj.id || i} className="border rounded-lg p-4 space-y-2 bg-gray-50">
            <p className="font-medium text-sm">
              {proj.name}
              {proj.technologies ? ` — ${proj.technologies}` : ""}
            </p>
            {proj.bullets.map((b, j) => (
              <div key={j} className="flex gap-2">
                <span className="text-gray-400 mt-2">-</span>
                <textarea
                  className="flex-1 border rounded-lg px-3 py-2 text-sm min-h-[40px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={b}
                  onChange={(e) => {
                    const copy = [...app.tailoredProjects];
                    copy[i] = {
                      ...copy[i],
                      bullets: copy[i].bullets.map((x, k) => (k === j ? e.target.value : x)),
                    };
                    setApp({ ...app, tailoredProjects: copy });
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Tailored Hobbies */}
      <section className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-semibold">Tailored Hobbies & Interests</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={app.tailoredHobbies.join(", ")}
          onChange={(e) =>
            setApp({
              ...app,
              tailoredHobbies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="Comma-separated hobbies..."
        />
      </section>

      {/* Cover Letter */}
      <section className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-semibold">Cover Letter</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={app.coverLetterBody}
          onChange={(e) => setApp({ ...app, coverLetterBody: e.target.value })}
          placeholder="AI-generated cover letter will appear here..."
        />
      </section>
    </div>
  );
}
