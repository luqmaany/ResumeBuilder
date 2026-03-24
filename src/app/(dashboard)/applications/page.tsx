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

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ companyName: "", roleTitle: "", jobDescription: "" });
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

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showNew ? "Cancel" : "+ New Application"}
        </button>
      </div>

      {showNew && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
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
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create & Open"}
          </button>
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
