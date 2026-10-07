"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Upload,
  Download,
  QrCode as QrCodeIcon,
} from "lucide-react";
import { tracks, getTrackById } from "@/lib/tracks";
import { SiteContentEditor } from "@/components/conference/SiteContentEditor";
import { QuestionsAdmin } from "@/components/conference/QuestionsAdmin";
import { QrCodeShare } from "@/components/conference/QrCodeShare";
import { useSiteContentValue } from "@/components/conference/SiteContentProvider";
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
 * NOTE: This page is intentionally not linked from the public site. Chairs
 * access it directly at /admin. Add authentication in a future iteration.
 */
export default function AdminPage() {
  const [tab, setTab] = useState<"session" | "content" | "questions" | "share">("session");
  const [selectedId, setSelectedId] = useState<number>(1);
  const [session, setSession] = useState<TrackSessionInfo>({ trackId: 1 });
  const [papers, setPapers] = useState<ResearchPaper[]>(
    Array.from({ length: 5 }, (_, i) => ({ trackId: 1, slot: i + 1 })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { get: getContent } = useSiteContentValue();

  // Build dynamic tracks list from content (same as main site).
  const trackCount = Math.max(
    1,
    parseInt(getContent("tracks.count", String(tracks.length)), 10) || tracks.length,
  );
  const dynamicTracks = Array.from({ length: trackCount }, (_, i) => {
    const id = i + 1;
    const staticTrack = getTrackById(id);
    return {
      id,
      title: getContent(`track.${id}.title`, staticTrack?.title ?? `المحور ${id}`),
      subtitle: getContent(`track.${id}.subtitle`, staticTrack?.subtitle ?? ""),
      folder: staticTrack?.folder ?? `track-${id}`,
      sessionId: staticTrack?.sessionId ?? `track-${id}`,
    };
  });

  // Use the dynamic track for the currently selected id (so the title/subtitle
  // shown in the session header reflects admin edits, not just the static
  // defaults).
  const selectedTrack =
    dynamicTracks.find((t) => t.id === selectedId) ?? dynamicTracks[0];

  // Keep selectedId within the dynamic range (so deleting a track doesn't
  // leave the admin stuck on a non-existent id).
  useEffect(() => {
    if (selectedId > trackCount) {
      setSelectedId(Math.max(1, trackCount));
    }
  }, [selectedId, trackCount]);

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
              لوحة الإدارة
            </h1>
            <p className="text-xs text-white/70" dir="rtl">
              تعديل بيانات الجلسة والأوراق البحثية ومحتوى الموقع
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
        {/* Top-level tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("session")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all",
              tab === "session"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            بيانات الجلسة
          </button>
          <button
            type="button"
            onClick={() => setTab("content")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all",
              tab === "content"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <FileText className="h-4 w-4" aria-hidden />
            محتوى الموقع
          </button>
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all",
              tab === "questions"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            إدارة الأسئلة
          </button>
          <button
            type="button"
            onClick={() => setTab("share")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all",
              tab === "share"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <QrCodeIcon className="h-4 w-4" aria-hidden />
            مشاركة / QR
          </button>
        </div>

        {tab === "content" ? (
          <SiteContentEditor />
        ) : tab === "questions" ? (
          <QuestionsAdmin />
        ) : tab === "share" ? (
          <>
            <QrCodeShare />
            <div className="rounded-2xl border border-[#E2E5EC] bg-[#F5F6F8] p-5 text-center">
              <p className="text-xs text-[#6B7280]" dir="rtl">
                اطبع رمز QR وضعه على شاشات العرض أو الكراسي ليسهل على الجمهور الوصول لصفحة طرح الأسئلة عبر كاميرا هواتفهم.
              </p>
            </div>
          </>
        ) : (
          <>
        {/* Track selector — dynamic, number-only chips (no icons) */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-[#0B1B3D]" dir="rtl">
            اختر محورك ({trackCount})
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {dynamicTracks.map((t) => {
              const active = t.id === selectedId;
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
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold",
                      active
                        ? "bg-[#D4AF37] text-[#0B1B3D]"
                        : "bg-[#0B1B3D] text-[#D4AF37]",
                    ].join(" ")}
                  >
                    {t.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-[#9CA3AF]">
                      المحور {t.id}
                    </span>
                    <span className="block truncate text-xs font-semibold text-[#0B1B3D]">
                      {t.subtitle || t.title}
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
            {/* Session header editor — navy gradient, no icon */}
            <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
              <div className="flex items-center gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-sm font-extrabold text-[#0B1B3D]">
                  {selectedId}
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-bold" dir="rtl">
                    {selectedTrack?.title ?? `المحور ${selectedId}`}
                  </h2>
                  <p className="text-xs text-white/80" dir="rtl">
                    {selectedTrack?.subtitle ?? ""}
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
                    trackId={selectedId}
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
          </motion.div>
        )}
          </>
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
  trackId,
  onChange,
}: {
  slot: number;
  paper: ResearchPaper;
  trackId: number;
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
        {/* PDF upload — paper */}
        <PdfUpload
          label="الورقة البحثية (PDF)"
          trackId={trackId}
          slot={slot}
          fileType="paper"
          onUploaded={(url) => onChange({ ...paper, paperUrl: url })}
        />
        {/* PDF upload — CV */}
        <PdfUpload
          label="السيرة الذاتية (PDF)"
          trackId={trackId}
          slot={slot}
          fileType="cv"
          onUploaded={(url) => onChange({ ...paper, cvUrl: url })}
        />
      </div>
    </div>
  );
}

/** PDF upload component — uploads to DB as base64, returns the download URL. */
function PdfUpload({
  label,
  trackId,
  slot,
  fileType,
  onUploaded,
}: {
  label: string;
  trackId: number;
  slot: number;
  fileType: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const downloadUrl = `/api/papers/download?trackId=${trackId}&slot=${slot}&fileType=${fileType}`;

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("الملف يجب أن يكون PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الملف يتجاوز ١٠ ميجابايت");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert to base64.
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        // Strip "data:application/pdf;base64," prefix.
        const base64 = result.split(",")[1] ?? "";

        const res = await fetch("/api/papers/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId,
            slot,
            fileType,
            fileName: file.name,
            data: base64,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Upload failed");
        }

        onUploaded(downloadUrl);
        setUploaded(true);
        setUploading(false);
      };
      reader.onerror = () => {
        setError("تعذر قراءة الملف");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("تعذر رفع الملف");
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef?.current?.click()}
          disabled={uploading}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0] px-3 text-sm font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37] disabled:opacity-50"
          dir="rtl"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              جاري الرفع...
            </>
          ) : uploaded ? (
            <>
              <Check className="h-4 w-4 text-green-600" aria-hidden />
              تم الرفع — معاينة
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden />
              رفع PDF
            </>
          )}
        </button>
        {uploaded && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
            dir="rtl"
          >
            <Download className="h-4 w-4" aria-hidden />
          </a>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[11px] font-semibold text-[#B91C1C]" dir="rtl">
          {error}
        </p>
      )}
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
