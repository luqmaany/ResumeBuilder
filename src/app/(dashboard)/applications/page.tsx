"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AppSummary {
  id: string;
  companyName: string;
  roleTitle: string;
  status: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generated: "bg-blue-100 text-blue-700",
  applied: "bg-green-100 text-green-700",
  interview: "bg-yellow-100 text-yellow-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

type ImportPhase = "idle" | "working";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    roleTitle: "",
    jobDescription: "",
    jobUrl: "",
  });
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
      });
  }, []);

  const importFromUrl = async () => {
    if (!jobUrl.trim()) return;
    setImportError("");
    setImportPhase("working");

    try {
      const res = await fetch("/api/applications/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();

      if (data.id) {
        const query =
          !res.ok && data.error
            ? `?importError=${encodeURIComponent(String(data.error))}`
            : "";
        router.push(`/applications/${data.id}${query}`);
        return;
      }

      setImportError(data.error ?? "Could not import that job link");
    } catch {
      setImportError("Something went wrong. Please try again.");
    } finally {
      setImportPhase("idle");
    }
  };

  const create = async () => {
    if (!form.companyName || !form.roleTitle || !form.jobDescription) return;
    setCreating(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const { id } = await res.json();
    setCreating(false);
    router.push(`/applications/${id}`);
  };

  const importing = importPhase !== "idle";
  const importLabel =
    importPhase === "working"
      ? "Reading job & generating resume..."
      : "Import & Generate Resume";

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <button
          onClick={() => {
            setShowNew(!showNew);
            setImportError("");
          }}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showNew ? "Cancel" : "+ New Application"}
        </button>
      </div>

      {showNew && (
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Paste a job link</h2>
            <p className="text-sm text-gray-500 mt-1">
              Works with Seek, Indeed, and most job boards. We&apos;ll read the posting and
              generate a tailored resume for your review.
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Job URL</span>
            <input
              type="url"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://www.seek.com.au/job/... or https://www.indeed.com/viewjob?..."
              disabled={importing}
            />
          </label>

          {importError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {importError}
            </p>
          )}

          <button
            onClick={importFromUrl}
            disabled={importing || !jobUrl.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importLabel}
          </button>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showManual ? "Hide manual entry" : "Or enter details manually"}
            </button>
          </div>

          {showManual && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Company</span>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Role</span>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={form.roleTitle}
                    onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Job Description</span>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={form.jobDescription}
                  onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                  placeholder="Paste the full job description here..."
                />
              </label>
              <button
                onClick={create}
                disabled={creating}
                className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create & Open"}
              </button>
            </div>
          )}
        </div>
      )}

      {apps.length === 0 && !showNew ? (
        <div className="text-center py-16 text-gray-400">
          No applications yet. Click &ldquo;+ New Application&rdquo; to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{app.roleTitle}</p>
                  <p className="text-sm text-gray-500">{app.companyName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[app.status] ?? STATUS_COLORS.draft}`}
                  >
                    {app.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(app.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
