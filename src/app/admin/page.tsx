"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings2,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Lock,
  FileText,
  Link2,
} from "lucide-react";
import { tracks } from "@/lib/tracks";
import { TrackIcon, getTrackGradient } from "@/components/conference/TrackIcon";
import { SessionReportEditor } from "@/components/conference/SessionReportEditor";
import type {
  TrackSessionInfo,
  ResearchPaper,
  TrackSessionApiResponse,
} from "@/types";

/**
 * Admin page — iPad-friendly interface for session chairs.
 *
 * Each chair selects their track and edits:
 *   - Session header (time / venue / chair / secretary)
 *   - 5 research-paper slots (title / researcher / paperUrl / cvUrl)
 *   - Private session report (saved to DB, not shown to visitors)
 *
 * PDFs are uploaded via git (place files in /public/papers/track-N/) and
 * referenced by URL here — Vercel's filesystem is read-only at runtime.
 *
 * NOTE: This page is intentionally not linked from the public site. Chairs
 * access it directly at /admin. Add authentication in a future iteration.
 */
export default function AdminPage() {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [session, setSession] = useState<TrackSessionInfo>({ trackId: 1 });
  const [papers, setPapers] = useState<ResearchPaper[]>(
    Array.from({ length: 5 }, (_, i) => ({ trackId: 1, slot: i + 1 })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTrack = tracks.find((t) => t.id === selectedId)!;
  const gradient = getTrackGradient(selectedTrack.icon);

  // Load session data when track changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${selectedId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as TrackSessionApiResponse;
        setSession(data.session);
        // Ensure 5 slots.
        setPapers(
          Array.from({ length: 5 }, (_, i) => data.papers[i] ?? { trackId: selectedId, slot: i + 1 }),
        );
      })
      .catch(() => {
        if (!active) return;
        setError("تعذر تحميل البيانات");
        setSession({ trackId: selectedId });
        setPapers(
          Array.from({ length: 5 }, (_, i) => ({ trackId: selectedId, slot: i + 1 })),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, papers }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedAt(new Date());
    } catch {
      setError("تعذر الحفظ — تأكد من اتصال قاعدة البيانات");
    } finally {
      setSaving(false);
    }
  }, [selectedId, session, papers]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      {/* Header */}
      <header className="border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
            <Settings2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h1 className="text-base font-bold sm:text-lg" dir="rtl">
              لوحة إدارة المحاور
            </h1>
            <p className="text-xs text-white/70" dir="rtl">
              لرؤساء الجلسات — تعديل بيانات المحور والتقرير
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/85"
            dir="rtl"
          >
            <Lock className="h-3 w-3" aria-hidden />
            خاص
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* Track selector */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-[#0B1B3D]" dir="rtl">
            اختر محورك
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {tracks.map((t) => {
              const active = t.id === selectedId;
              const g = getTrackGradient(t.icon);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={[
                    "flex items-center gap-2 rounded-xl border p-3 text-right transition-all",
                    active
                      ? "border-[#D4AF37] bg-white shadow-md"
                      : "border-[#E2E5EC] bg-white/60 hover:border-[#D4AF37]/40",
                  ].join(" ")}
                  dir="rtl"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${g}`}
                  >
                    <TrackIcon icon={t.icon} iconClassName="h-4 w-4 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-[#9CA3AF]">
                      المحور {t.id}
                    </span>
                    <span className="block truncate text-xs font-semibold text-[#0B1B3D]">
                      {t.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Loading / Error */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
            <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            <span className="text-sm" dir="rtl">
              جاري التحميل...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-6 text-[#B91C1C]">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm" dir="rtl">
              {error}
            </span>
          </div>
        ) : (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Session header editor */}
            <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
              <div className={`flex items-center gap-3 bg-gradient-to-l ${gradient} px-5 py-4 text-white`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <TrackIcon icon={selectedTrack.icon} iconClassName="h-5 w-5 text-white" />
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-bold" dir="rtl">
                    {selectedTrack.title}
                  </h2>
                  <p className="text-xs text-white/80" dir="rtl">
                    {selectedTrack.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field
                  label="التوقيت"
                  value={session.time ?? ""}
                  onChange={(v) => setSession({ ...session, time: v })}
                  placeholder="مثلاً: ٩:٠٠ ص – ١٠:٣٠ ص"
                />
                <Field
                  label="المكان"
                  value={session.venue ?? ""}
                  onChange={(v) => setSession({ ...session, venue: v })}
                  placeholder="مثلاً: قاعة المؤتمرات - مركز البحوث"
                />
                <Field
                  label="إدارة الجلسة"
                  value={session.chair ?? ""}
                  onChange={(v) => setSession({ ...session, chair: v })}
                  placeholder="اسم رئيس الجلسة"
                />
                <Field
                  label="مقرر الجلسة"
                  value={session.secretary ?? ""}
                  onChange={(v) => setSession({ ...session, secretary: v })}
                  placeholder="اسم مقرر الجلسة"
                />
              </div>
            </section>

            {/* Research papers editor */}
            <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
                <FileText className="h-4 w-4 text-[#D4AF37]" aria-hidden />
                <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                  الأوراق البحثية (٥ أوراق)
                </h3>
              </div>
              <div className="space-y-4 p-5">
                {papers.map((p, i) => (
                  <PaperSlotEditor
                    key={p.slot}
                    slot={p.slot}
                    paper={p}
                    trackFolder={`track-${selectedId}`}
                    onChange={(updated) => {
                      setPapers((prev) =>
                        prev.map((x) => (x.slot === updated.slot ? updated : x)),
                      );
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Save button */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-sm">
              {savedAt ? (
                <p
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-600"
                  dir="rtl"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  تم الحفظ — {savedAt.toLocaleTimeString("ar")}
                </p>
              ) : error ? (
                <p className="text-sm font-semibold text-[#B91C1C]" dir="rtl">
                  {error}
                </p>
              ) : (
                <p className="text-xs text-[#9CA3AF]" dir="rtl">
                  احفظ التغييرات لتحديث صفحة المحور للزوار
                </p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B3D] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#07152F] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                حفظ بيانات المحور
              </button>
            </div>

            {/* Private session report */}
            <SessionReportEditor
              trackId={selectedId}
              trackTitle={selectedTrack.title}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}

/** A labeled text input field. */
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        className="h-11 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
      />
    </div>
  );
}

/** Editor for a single research-paper slot. */
function PaperSlotEditor({
  slot,
  paper,
  trackFolder,
  onChange,
}: {
  slot: number;
  paper: ResearchPaper;
  trackFolder: string;
  onChange: (p: ResearchPaper) => void;
}) {
  return (
    <div className="rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B1B3D] text-xs font-bold text-[#D4AF37]">
          {slot}
        </span>
        <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
          الورقة البحثية {slot}
        </h4>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="عنوان الورقة"
          value={paper.title ?? ""}
          onChange={(v) => onChange({ ...paper, title: v })}
          placeholder="عنوان البحث"
        />
        <Field
          label="الباحث"
          value={paper.researcher ?? ""}
          onChange={(v) => onChange({ ...paper, researcher: v })}
          placeholder="اسم الباحث"
        />
        <UrlField
          label="رابط الورقة (PDF)"
          value={paper.paperUrl ?? ""}
          onChange={(v) => onChange({ ...paper, paperUrl: v })}
          placeholder={`/papers/${trackFolder}/paper-${slot}.pdf`}
          hint={`ارفع الملف في: public/papers/${trackFolder}/paper-${slot}.pdf`}
        />
        <UrlField
          label="رابط السيرة الذاتية (PDF)"
          value={paper.cvUrl ?? ""}
          onChange={(v) => onChange({ ...paper, cvUrl: v })}
          placeholder={`/papers/${trackFolder}/cv-${slot}.pdf`}
          hint={`ارفع الملف في: public/papers/${trackFolder}/cv-${slot}.pdf`}
        />
      </div>
    </div>
  );
}

/** A labeled URL input with a hint about where to place the file. */
function UrlField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#0B1B3D]" dir="rtl">
        <Link2 className="h-3 w-3 text-[#9CA3AF]" aria-hidden />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="h-11 w-full rounded-xl border border-[#E2E5EC] bg-white px-4 text-left text-sm text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
      />
      {hint && (
        <p className="mt-1 text-[10px] text-[#9CA3AF]" dir="ltr">
          {hint}
        </p>
      )}
    </div>
  );
}
