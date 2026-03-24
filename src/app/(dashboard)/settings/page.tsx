"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Applications");
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/google/sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.spreadsheetId) {
          setSpreadsheetId(data.spreadsheetId);
          setSheetName(data.sheetName || "Applications");
          setConnected(true);
        }
      });
  }, []);

  const save = async () => {
    if (!spreadsheetId) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/google/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spreadsheetId, sheetName }),
    });
    setSaving(false);
    if (res.ok) {
      setConnected(true);
      setStatus("Saved! Your applications will sync to this spreadsheet.");
    } else {
      const data = await res.json();
      setStatus("Error: " + (data.error ?? "Failed to save"));
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Google Sheets Integration</h2>
        <p className="text-sm text-gray-500">
          Connect a Google Spreadsheet to automatically track your applications.
          When you mark an application as &ldquo;applied,&rdquo; a row will be
          appended with the date, company, role, and status.
        </p>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Spreadsheet ID
            </span>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
            <p className="text-xs text-gray-400">
              Found in the URL of your Google Sheet:
              docs.google.com/spreadsheets/d/<strong>THIS_PART</strong>/edit
            </p>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Sheet Name (tab)
            </span>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Applications"
            />
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving || !spreadsheetId}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : connected ? "Update" : "Connect"}
        </button>

        {status && (
          <p
            className={`text-sm ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
          >
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
