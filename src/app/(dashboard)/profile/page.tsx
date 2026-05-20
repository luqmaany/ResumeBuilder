"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import type {
  MasterProfile,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  SectionConfigItem,
} from "@/lib/types";
import { DEFAULT_SECTION_CONFIG, normalizeSectionConfig } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function emptyExperience(): ExperienceItem {
  return { id: uuid(), company: "", title: "", location: "", startDate: "", endDate: "Present", bullets: [""] };
}
function emptyEducation(): EducationItem {
  return { id: uuid(), institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "", bullets: [] };
}
function emptyProject(): ProjectItem {
  return { id: uuid(), name: "", description: "", technologies: "", startDate: "", endDate: "Present", url: "", bullets: [""] };
}

function validateProfile(p: MasterProfile): string[] {
  const errors: string[] = [];

  if (!p.fullName.trim()) errors.push("Full Name is required");
  if (!p.email.trim()) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push("Email is not valid");

  p.experience.forEach((exp, i) => {
    const label = exp.company || `Experience #${i + 1}`;
    if (!exp.company.trim()) errors.push(`${label}: Company is required`);
    if (!exp.title.trim()) errors.push(`${label}: Title is required`);
    if (!exp.startDate.trim()) errors.push(`${label}: Start date is required`);
  });

  p.education.forEach((edu, i) => {
    const label = edu.institution || `Education #${i + 1}`;
    if (!edu.institution.trim()) errors.push(`${label}: Institution is required`);
    if (!edu.degree.trim()) errors.push(`${label}: Degree is required`);
  });

  p.projects.forEach((proj, i) => {
    const label = proj.name || `Project #${i + 1}`;
    if (!proj.name.trim()) errors.push(`${label}: Project name is required`);
  });

  return errors;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile({
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          linkedin: data.linkedin ?? "",
          github: data.github ?? "",
          website: data.website ?? "",
          summary: data.summary ?? "",
          experience: Array.isArray(data.experience) ? data.experience : [],
          education: Array.isArray(data.education) ? data.education : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          hobbies: Array.isArray(data.hobbies) ? data.hobbies : [],
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          customSections: Array.isArray(data.customSections) ? data.customSections : [],
          sectionConfig: normalizeSectionConfig(data.sectionConfig),
        });
      });
  }, []);

  useEffect(() => {
    if (profile && showErrors) {
      setErrors(validateProfile(profile));
    }
  }, [profile, showErrors]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;
    const validationErrors = validateProfile(profile);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShowErrors(true);
      setStatus("");
      return false;
    }
    setErrors([]);
    setShowErrors(false);
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (res.ok) {
      setStatus("Saved!");
      return true;
    }
    const data = await res.json();
    setStatus("Error: " + JSON.stringify(data.error));
    return false;
  }, [profile]);

  const downloadResume = async () => {
    const ok = await save();
    if (!ok) return;
    setStatus("");
    window.open("/api/export/resume/profile", "_blank");
  };

  const previewResume = async () => {
    const ok = await save();
    if (!ok) return;
    setStatus("");
    window.open("/api/export/resume/profile?preview=1", "_blank");
  };

  if (!profile) {
    return <div className="text-center py-20 text-gray-400">Loading profile...</div>;
  }

  const updateField = (field: keyof MasterProfile, value: unknown) =>
    setProfile((p) => (p ? { ...p, [field]: value } : p));

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

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
      </div>

      {status && (
        <p className={`text-sm ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {status}
        </p>
      )}
      {showErrors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-red-700">Please fix the following before saving:</p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Contact info ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={profile.fullName} onChange={(v) => updateField("fullName", v)} required error={showErrors && !profile.fullName.trim()} />
          <Input label="Email" value={profile.email} onChange={(v) => updateField("email", v)} required error={showErrors && (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))} />
          <Input label="Phone" value={profile.phone} onChange={(v) => updateField("phone", v)} />
          <Input label="Location" value={profile.location} onChange={(v) => updateField("location", v)} />
          <Input label="LinkedIn" value={profile.linkedin} onChange={(v) => updateField("linkedin", v)} />
          <Input label="GitHub" value={profile.github} onChange={(v) => updateField("github", v)} />
          <Input label="Website" value={profile.website} onChange={(v) => updateField("website", v)} />
        </div>
      </section>

      {/* ── Summary ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Professional Summary</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={profile.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="A brief overview of your background and strengths..."
        />
      </section>

      {/* ── Experience ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Experience</h2>
          <button
            onClick={() => updateField("experience", [...profile.experience, emptyExperience()])}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add role
          </button>
        </div>
        {profile.experience.map((exp, i) => (
          <ExperienceCard
            key={exp.id}
            item={exp}
            onChange={(updated) => {
              const copy = [...profile.experience];
              copy[i] = updated;
              updateField("experience", copy);
            }}
            onRemove={() => updateField("experience", profile.experience.filter((_, j) => j !== i))}
            showErrors={showErrors}
          />
        ))}
      </section>

      {/* ── Education ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Education</h2>
          <button
            onClick={() => updateField("education", [...profile.education, emptyEducation()])}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add education
          </button>
        </div>
        {profile.education.map((edu, i) => (
          <EducationCard
            key={edu.id}
            item={edu}
            onChange={(updated) => {
              const copy = [...profile.education];
              copy[i] = updated;
              updateField("education", copy);
            }}
            onRemove={() => updateField("education", profile.education.filter((_, j) => j !== i))}
            showErrors={showErrors}
          />
        ))}
      </section>

      {/* ── Skills ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Skills</h2>
        <CommaSeparatedInput
          items={profile.skills}
          onChange={(v) => updateField("skills", v)}
          placeholder="JavaScript, TypeScript, React, Node.js, ..."
        />
        <p className="text-xs text-gray-400">Comma-separated</p>
      </section>

      {/* ── Hobbies ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Hobbies & Interests</h2>
        <CommaSeparatedInput
          items={profile.hobbies}
          onChange={(v) => updateField("hobbies", v)}
          placeholder="Reading, Hiking, Open-source contributing, ..."
        />
        <p className="text-xs text-gray-400">Comma-separated</p>
      </section>

      {/* ── Projects ── */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projects</h2>
          <button
            onClick={() => updateField("projects", [...profile.projects, emptyProject()])}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add project
          </button>
        </div>
        {profile.projects.map((proj, i) => (
          <ProjectCard
            key={proj.id}
            item={proj}
            onChange={(updated) => {
              const copy = [...profile.projects];
              copy[i] = updated;
              updateField("projects", copy);
            }}
            onRemove={() => updateField("projects", profile.projects.filter((_, j) => j !== i))}
            showErrors={showErrors}
          />
        ))}
      </section>

      {/* ── Section ordering ── */}
      <SectionOrderEditor
        sectionConfig={profile.sectionConfig}
        onChange={(updated) => updateField("sectionConfig", updated)}
      />

      <div className="pb-12">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Reusable components ─────────────────────────────────────────────

function CommaSeparatedInput({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(items.join(", "));

  useEffect(() => {
    setText(items.join(", "));
  }, [items]);

  return (
    <textarea
      className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(text.split(",").map((s) => s.trim()).filter(Boolean))
      }
      placeholder={placeholder}
    />
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${
          error
            ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-400"
            : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function parseMonthYear(value: string): { month: string; year: string } {
  if (!value || value === "Present") return { month: "", year: "" };
  const parts = value.split(" ");
  if (parts.length === 2 && MONTHS.includes(parts[0] as typeof MONTHS[number])) {
    return { month: parts[0], year: parts[1] };
  }
  return { month: "", year: "" };
}

function MonthYearPicker({
  label,
  value,
  onChange,
  allowPresent = false,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowPresent?: boolean;
  required?: boolean;
  error?: boolean;
}) {
  const isPresent = value === "Present";
  const parsed = parseMonthYear(value);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const p = parseMonthYear(value);
    setMonth(p.month);
    setYear(p.year);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 5; y >= 1970; y--) years.push(y);

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    if (newMonth && year) onChange(`${newMonth} ${year}`);
  }

  function handleYearChange(newYear: string) {
    setYear(newYear);
    if (month && newYear) onChange(`${month} ${newYear}`);
  }

  const selectClass = error
    ? "flex-1 border border-red-400 bg-red-50 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none"
    : "flex-1 border rounded-lg px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";

  return (
    <div className="block space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {allowPresent && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPresent}
              onChange={(e) => onChange(e.target.checked ? "Present" : "")}
              className="accent-blue-600"
            />
            Present
          </label>
        )}
      </div>
      {!isPresent && (
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function parseBulletText(text: string): string[] {
  const bulletPattern = /(?:^|\n)\s*[•\-\*]\s*/;
  if (!bulletPattern.test(text)) return [];

  const parts = text.split(/\n\s*[•\-\*]\s*/);
  const result: string[] = [];
  for (const part of parts) {
    const cleaned = part
      .replace(/^\s*[•\-\*]\s*/, "")
      .replace(/\s*\n\s*/g, " ")
      .trim();
    if (cleaned) result.push(cleaned);
  }
  return result;
}

function BulletList({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>, index: number) {
    const pasted = e.clipboardData.getData("text/plain");
    const parsed = parseBulletText(pasted);
    if (parsed.length < 2) return;

    e.preventDefault();
    const before = bullets.slice(0, index);
    const after = bullets.slice(index + 1);
    onChange([...before, ...parsed, ...after]);
  }

  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-gray-400 mt-2">-</span>
          <textarea
            className="flex-1 border rounded-lg px-3 py-2 text-sm min-h-[40px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            value={b}
            onChange={(e) => {
              const copy = [...bullets];
              copy[i] = e.target.value;
              onChange(copy);
            }}
            onPaste={(e) => handlePaste(e, i)}
            placeholder="Paste multiple bullets (separated by •, -, or *) to auto-split"
          />
          <button
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            x
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...bullets, ""])}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + Add bullet
      </button>
    </div>
  );
}

function ExperienceCard({
  item,
  onChange,
  onRemove,
  showErrors,
}: {
  item: ExperienceItem;
  onChange: (item: ExperienceItem) => void;
  onRemove: () => void;
  showErrors?: boolean;
}) {
  const set = (field: keyof ExperienceItem, value: unknown) =>
    onChange({ ...item, [field]: value });

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${showErrors && (!item.company.trim() || !item.title.trim() || !item.startDate.trim()) ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <Input label="Company" value={item.company} onChange={(v) => set("company", v)} required error={showErrors && !item.company.trim()} />
          <Input label="Title" value={item.title} onChange={(v) => set("title", v)} required error={showErrors && !item.title.trim()} />
          <Input label="Location" value={item.location} onChange={(v) => set("location", v)} />
          <div className="grid grid-cols-2 gap-2">
            <MonthYearPicker label="Start" value={item.startDate} onChange={(v) => set("startDate", v)} required error={showErrors && !item.startDate.trim()} />
            <MonthYearPicker label="End" value={item.endDate} onChange={(v) => set("endDate", v)} allowPresent />
          </div>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 ml-2 text-sm">
          Remove
        </button>
      </div>
      <BulletList bullets={item.bullets} onChange={(b) => set("bullets", b)} />
    </div>
  );
}

function EducationCard({
  item,
  onChange,
  onRemove,
  showErrors,
}: {
  item: EducationItem;
  onChange: (item: EducationItem) => void;
  onRemove: () => void;
  showErrors?: boolean;
}) {
  const set = (field: keyof EducationItem, value: unknown) =>
    onChange({ ...item, [field]: value });

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${showErrors && (!item.institution.trim() || !item.degree.trim()) ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <Input label="Institution" value={item.institution} onChange={(v) => set("institution", v)} required error={showErrors && !item.institution.trim()} />
          <Input label="Degree" value={item.degree} onChange={(v) => set("degree", v)} required error={showErrors && !item.degree.trim()} />
          <Input label="Field of Study" value={item.field} onChange={(v) => set("field", v)} />
          <div className="grid grid-cols-2 gap-2">
            <MonthYearPicker label="Start Date" value={item.startDate} onChange={(v) => set("startDate", v)} />
            <MonthYearPicker label="End Date" value={item.endDate} onChange={(v) => set("endDate", v)} allowPresent />
          </div>
          <Input label="GPA (optional)" value={item.gpa} onChange={(v) => set("gpa", v)} />
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 ml-2 text-sm">
          Remove
        </button>
      </div>
    </div>
  );
}

function SectionOrderEditor({
  sectionConfig,
  onChange,
}: {
  sectionConfig: SectionConfigItem[];
  onChange: (config: SectionConfigItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sorted = [...sectionConfig].sort((a, b) => a.order - b.order);
  const ids = sorted.map((s) => s.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((s, i) => ({
      ...s,
      order: i,
    }));
    onChange(reordered);
  }

  return (
    <section className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="text-lg font-semibold">Section Order & Visibility</h2>
      <p className="text-sm text-gray-500">
        Drag sections to reorder. Toggle visibility with the checkbox.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sorted.map((sec) => (
              <SortableSectionRow
                key={sec.id}
                section={sec}
                onToggleVisible={(checked) => {
                  const updated = sectionConfig.map((s) =>
                    s.id === sec.id ? { ...s, visible: checked } : s
                  );
                  onChange(updated);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableSectionRow({
  section,
  onToggleVisible,
}: {
  section: SectionConfigItem;
  onToggleVisible: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg border ${
        isDragging
          ? "bg-blue-50 border-blue-300 shadow-md"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
        {...attributes}
        {...listeners}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <input
        type="checkbox"
        checked={section.visible}
        onChange={(e) => onToggleVisible(e.target.checked)}
        className="accent-blue-600"
      />
      <span className={section.visible ? "text-gray-800" : "text-gray-400 line-through"}>
        {section.title}
      </span>
    </div>
  );
}

function ProjectCard({
  item,
  onChange,
  onRemove,
  showErrors,
}: {
  item: ProjectItem;
  onChange: (item: ProjectItem) => void;
  onRemove: () => void;
  showErrors?: boolean;
}) {
  const set = (field: keyof ProjectItem, value: unknown) =>
    onChange({ ...item, [field]: value });

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${showErrors && !item.name.trim() ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <Input label="Project Name" value={item.name} onChange={(v) => set("name", v)} required error={showErrors && !item.name.trim()} />
          <Input label="Technologies (optional)" value={item.technologies ?? ""} onChange={(v) => set("technologies", v)} />
          <Input label="URL (optional)" value={item.url} onChange={(v) => set("url", v)} />
          <div className="grid grid-cols-2 gap-2">
            <MonthYearPicker label="Start" value={item.startDate} onChange={(v) => set("startDate", v)} />
            <MonthYearPicker label="End" value={item.endDate} onChange={(v) => set("endDate", v)} allowPresent />
          </div>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 ml-2 text-sm">
          Remove
        </button>
      </div>
      <BulletList bullets={item.bullets} onChange={(b) => set("bullets", b)} />
    </div>
  );
}
