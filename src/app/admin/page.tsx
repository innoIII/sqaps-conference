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
  ClipboardList,
  Plus,
  Inbox,
  Trash2,
  MapPin,
} from "lucide-react";
import { tracks, getTrackById } from "@/lib/tracks";
import { SiteContentEditor } from "@/components/conference/SiteContentEditor";
import { QuestionsAdmin } from "@/components/conference/QuestionsAdmin";
import { QrCodeShare } from "@/components/conference/QrCodeShare";
import { AiStatusPanel } from "@/components/conference/AiStatusPanel";
import { AiBackupPlan } from "@/components/conference/AiBackupPlan";
import { ReportsAdmin } from "@/components/conference/ReportsAdmin";
import { BackupPanel } from "@/components/conference/BackupPanel";
import { DashboardStats } from "@/components/conference/DashboardStats";
import { MapAdmin } from "@/components/conference/MapAdmin";
import { UsageMeters } from "@/components/conference/UsageMeters";
import { fresh } from "@/lib/cache";
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
  const [tab, setTab] = useState<"session" | "content" | "questions" | "reports" | "map" | "share">("session");
  // Halls defined on the /map page (for the per-session hall picker).
  const [mapHalls, setMapHalls] = useState<{ id: string; ar: string; placed: boolean }[]>([]);
  useEffect(() => {
    if (tab !== "session") return;
    fetch(`/api/map-config${fresh()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMapHalls(d.halls ?? []))
      .catch(() => {});
  }, [tab]);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [session, setSession] = useState<TrackSessionInfo>({ trackId: 1 });
  const [papers, setPapers] = useState<ResearchPaper[]>(
    Array.from({ length: 5 }, (_, i) => ({ trackId: 1, slot: i + 1 })),
  );
  const [deletedPaperSlots, setDeletedPaperSlots] = useState<number[]>([]);
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
      title: getContent(`track.${id}.title`, staticTrack?.title ?? `الجلسة ${id}`),
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
    setDeletedPaperSlots([]); // Clear deletion queue when switching tracks.
    fetch(`/api/sessions/${selectedId}${fresh()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as TrackSessionApiResponse;
        setSession(data.session);
        // Use papers from the API directly (dynamic count).
        setPapers(
          data.papers.length > 0
            ? data.papers
            : Array.from({ length: 5 }, (_, i) => ({ trackId: selectedId, slot: i + 1 })),
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

  // ── Track previous selectedId to save before switching ──
  const prevSelectedIdRef = useRef(selectedId);

  // Before switching tracks: save the current track's data immediately.
  useEffect(() => {
    if (prevSelectedIdRef.current !== selectedId) {
      // We're switching tracks — save the PREVIOUS track's data first.
      const prevId = prevSelectedIdRef.current;
      // Use the current state (which still has the previous track's data).
      fetch(`/api/sessions/${prevId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          papers,
          deletedSlots: deletedPaperSlots,
        }),
      }).catch(() => {
        // Silent — best-effort save before switch.
      });
      prevSelectedIdRef.current = selectedId;
      // Clear any pending auto-save timer.
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }
  }, [selectedId, session, papers, deletedPaperSlots]);

  // ── Auto-save: 2s after last edit (debounced) ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;

    // Clear existing timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Debounced auto-save: 2s after last edit
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/sessions/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session,
            papers,
            deletedSlots: deletedPaperSlots,
          }),
        });
        if (!res.ok) throw new Error("save failed");
        setSavedAt(new Date());
        setDeletedPaperSlots([]);
        // Broadcast: notify all tabs that data changed so they can re-fetch.
        if (typeof window !== "undefined") {
          window.localStorage.setItem("sqaps-data-updated", `${Date.now()}`);
        }
      } catch {
        setError("تعذر الحفظ التلقائي — تأكد من اتصال قاعدة البيانات");
      } finally {
        setSaving(false);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [session, papers, selectedId, loading, deletedPaperSlots]);

  // Manual save (backup button)
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          papers,
          deletedSlots: deletedPaperSlots,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedAt(new Date());
      setDeletedPaperSlots([]);
      // Broadcast: notify all tabs that data changed.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sqaps-data-updated", `${Date.now()}`);
      }
    } catch {
      setError("تعذر الحفظ — تأكد من اتصال قاعدة البيانات");
    } finally {
      setSaving(false);
    }
  }, [selectedId, session, papers, deletedPaperSlots]);

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
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
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
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
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
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
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
            onClick={() => setTab("reports")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
              tab === "reports"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            التقارير
          </button>
          <button
            type="button"
            onClick={() => setTab("map")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
              tab === "map"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            الخريطة
          </button>
          <button
            type="button"
            onClick={() => setTab("share")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
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
        ) : tab === "reports" ? (
          <ReportsAdmin />
        ) : tab === "map" ? (
          <MapAdmin />
        ) : tab === "share" ? (
          <>
            <QrCodeShare />
            <AiStatusPanel />
            <AiBackupPlan />
            <BackupPanel />
            <div className="rounded-2xl border border-[#E2E5EC] bg-[#F5F6F8] p-5 text-center">
              <p className="text-xs text-[#6B7280]" dir="rtl">
                اطبع رمز QR وضعه على شاشات العرض أو الكراسي ليسهل على الجمهور الوصول لصفحة طرح الأسئلة عبر كاميرا هواتفهم.
              </p>
            </div>
          </>
        ) : (
          <>
        {/* Dashboard stats — quick overview */}
        <DashboardStats />

        {/* Free-plan usage meters (storage, compute hours, Functions Storage) */}
        <UsageMeters />

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
                    "flex items-center gap-2 rounded-xl border p-3 text-right transition",
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
                    {selectedTrack?.title ?? `الجلسة ${selectedId}`}
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
                <div className="sm:col-span-2">
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#0B1B3D]" dir="rtl">
                    <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                    القاعة على الخريطة
                    <span className="font-normal text-[#9CA3AF]">(تظهر الجلسة عليها في دليل القاعات)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={session.mapHall ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const hall = mapHalls.find((h) => h.id === id);
                        setSession({
                          ...session,
                          mapHall: id,
                          // Fill the venue text from the hall when it is still empty.
                          venue: session.venue?.trim() ? session.venue : hall?.ar ?? session.venue,
                        });
                      }}
                      dir="rtl"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    >
                      <option value="">— بدون قاعة على الخريطة —</option>
                      {mapHalls.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.ar}
                          {h.placed ? "" : " (غير محدّدة على الخريطة بعد)"}
                        </option>
                      ))}
                    </select>
                    {session.mapHall && (
                      <a
                        href={`/map?to=${encodeURIComponent(session.mapHall)}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0] px-4 text-xs font-bold text-[#0B1B3D] hover:bg-[#D4AF37]"
                        dir="rtl"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        عرضها على الخريطة
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setTab("map")}
                      className="inline-flex h-11 items-center rounded-xl px-2 text-xs font-semibold text-[#6B7280] underline-offset-2 hover:underline"
                      dir="rtl"
                    >
                      تعديل أماكن القاعات
                    </button>
                  </div>
                </div>
                <Field
                  label="إدارة الجلسة"
                  value={session.chair ?? ""}
                  onChange={(v) => setSession({ ...session, chair: v })}
                  placeholder="اسم رئيس الجلسة"
                />
                <Field
                  label="هاتف رئيس الجلسة"
                  value={session.chairPhone ?? ""}
                  onChange={(v) => setSession({ ...session, chairPhone: v })}
                  placeholder="+968 9xxx xxxx"
                  phone
                />
                <Field
                  label="مقرر الجلسة"
                  value={session.secretary ?? ""}
                  onChange={(v) => setSession({ ...session, secretary: v })}
                  placeholder="اسم مقرر الجلسة"
                />
                <Field
                  label="هاتف مقرر الجلسة"
                  value={session.secretaryPhone ?? ""}
                  onChange={(v) => setSession({ ...session, secretaryPhone: v })}
                  placeholder="+968 9xxx xxxx"
                  phone
                />
              </div>
            </section>

            {/* Research papers editor */}
            <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#D4AF37]" aria-hidden />
                  <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                    الأوراق البحثية ({papers.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Add a new paper at the next available slot.
                    const maxSlot = papers.reduce((max, p) => Math.max(max, p.slot), 0);
                    const newSlot = maxSlot + 1;
                    setPapers((prev) => [
                      ...prev,
                      { trackId: selectedId, slot: newSlot },
                    ]);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B1B3D] px-3 text-xs font-bold text-[#D4AF37] transition-colors hover:bg-[#07152F]"
                  dir="rtl"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  إضافة ورقة
                </button>
              </div>
              <div className="space-y-4 p-5">
                {papers.map((p) => (
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
                    onDelete={() => {
                      // Remove from local state + mark for DB deletion on save.
                      setPapers((prev) => prev.filter((x) => x.slot !== p.slot));
                      setDeletedPaperSlots((prev) => [...prev, p.slot]);
                    }}
                  />
                ))}
                {papers.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 text-[#9CA3AF]">
                    <Inbox className="h-5 w-5" aria-hidden />
                    <span className="text-sm" dir="rtl">
                      لا توجد أوراق بحثية — اضغط "إضافة ورقة" لبدء الإضافة
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Export + Save buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const trackTitle =
                      dynamicTracks.find((t) => t.id === selectedId)?.title ??
                      `الجلسة ${selectedId}`;
                    const lines: string[] = [
                      `أوراق المحور: ${trackTitle}`,
                      `المحور: ${selectedId}`,
                      `عدد الأوراق: ${papers.length}`,
                      "",
                      "=".repeat(50),
                      "",
                    ];
                    for (const p of papers) {
                      lines.push(`الورقة ${p.slot}:`);
                      if (p.title) lines.push(`  العنوان: ${p.title}`);
                      if (p.researcher) lines.push(`  الباحث: ${p.researcher}`);
                      if (p.phone) lines.push(`  الهاتف: ${p.phone.split("\n").filter(Boolean).join("، ")}`);
                      if (p.paperUrl) lines.push(`  الورقة البحثية: ${p.paperUrl}`);
                      if (p.cvUrl) lines.push(`  السيرة الذاتية: ${p.cvUrl}`);
                      lines.push("");
                    }
                    const blob = new Blob([lines.join("\n")], {
                      type: "text/plain;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `أوراق-المحور-${selectedId}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={papers.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0] px-4 text-sm font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37] disabled:opacity-40"
                  dir="rtl"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  تصدير الأوراق
                </button>
                {/* Save status */}
                <div className="flex items-center gap-2">
                  {saving ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37]" dir="rtl">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      جاري الحفظ التلقائي...
                    </span>
                  ) : error ? (
                    <span className="text-xs font-semibold text-[#B91C1C]" dir="rtl">
                      {error}
                    </span>
                  ) : savedAt ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600" dir="rtl">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      تم الحفظ — {savedAt.toLocaleTimeString("ar")}
                    </span>
                  ) : (
                    <span className="text-xs text-[#9CA3AF]" dir="rtl">
                      الحفظ تلقائي — عدّل البيانات وتُحفظ فوراً
                    </span>
                  )}
                </div>
              </div>
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
                حفظ فوري
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

/** A labeled text input field (`phone` → tel keyboard, left-to-right digits). */
function Field({
  label,
  value,
  onChange,
  placeholder,
  phone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  phone?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
        {label}
      </label>
      <input
        type={phone ? "tel" : "text"}
        inputMode={phone ? "tel" : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={phone ? "ltr" : "rtl"}
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
  onDelete,
}: {
  slot: number;
  paper: ResearchPaper;
  trackId: number;
  onChange: (p: ResearchPaper) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B1B3D] text-xs font-bold text-[#D4AF37]">
          {slot}
        </span>
        <h4 className="flex-1 text-sm font-bold text-[#0B1B3D]" dir="rtl">
          الورقة البحثية {slot}
        </h4>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="حذف الورقة"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-[#B91C1C] transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Title — textarea for long Arabic titles */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
            عنوان الورقة
          </label>
          <textarea
            value={paper.title ?? ""}
            onChange={(e) => onChange({ ...paper, title: e.target.value })}
            placeholder="اكتب عنوان البحث كاملاً..."
            dir="rtl"
            rows={2}
            className="scroll-elegant w-full resize-none rounded-xl border border-[#E2E5EC] bg-white p-3 text-sm text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
        {/* Researchers — textarea, one name per line */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
            الباحثون{" "}
            <span className="text-[#9CA3AF]">(اسم واحد في كل سطر)</span>
          </label>
          <textarea
            value={paper.researcher ?? ""}
            onChange={(e) => onChange({ ...paper, researcher: e.target.value })}
            placeholder={"اكتب اسم كل باحث في سطر منفصل...\nمثال:\nد. عبدالله العامري\nأ. سالم الكندي"}
            dir="rtl"
            rows={3}
            className="scroll-elegant w-full resize-none rounded-xl border border-[#E2E5EC] bg-white p-3 text-sm text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {(paper.researcher ?? "").trim() && (
            <p className="mt-1 text-[10px] text-[#9CA3AF]" dir="rtl">
              {(paper.researcher ?? "").split("\n").filter((s) => s.trim()).length} باحث/باحثين
            </p>
          )}
        </div>
        {/* Researcher phones — one per researcher, same order as the names */}
        <ResearcherPhones paper={paper} onChange={onChange} />
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

/**
 * One phone input per researcher name. Stored in `paper.phone` as lines that
 * line up with the (non-empty) lines of `paper.researcher`.
 */
function ResearcherPhones({
  paper,
  onChange,
}: {
  paper: ResearchPaper;
  onChange: (p: ResearchPaper) => void;
}) {
  const names = (paper.researcher ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return null;
  const phones = (paper.phone ?? "").split("\n");
  const setPhone = (i: number, value: string) => {
    const next = names.map((_, j) => (j === i ? value : (phones[j] ?? "").trim()));
    // Drop trailing empty lines so an untouched paper stays empty.
    while (next.length && !next[next.length - 1]) next.pop();
    onChange({ ...paper, phone: next.join("\n") });
  };
  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-xs font-semibold text-[#0B1B3D]" dir="rtl">
        {names.length > 1 ? "أرقام هواتف الباحثين" : "رقم هاتف الباحث"}{" "}
        <span className="text-[#9CA3AF]">(يظهر تحت الاسم في الموقع)</span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {names.map((name, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-[#E2E5EC] bg-white px-3"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#0B1B3D]" dir="rtl" title={name}>
              {name}
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={(phones[i] ?? "").trim()}
              onChange={(e) => setPhone(i, e.target.value)}
              placeholder="+968 9xxx xxxx"
              aria-label={`رقم هاتف ${name}`}
              dir="ltr"
              className="h-10 w-40 shrink-0 bg-transparent text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>
        ))}
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

        try {
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
            throw new Error(err.error || `فشل الرفع (HTTP ${res.status})`);
          }

          onUploaded(downloadUrl);
          setUploaded(true);
          setUploading(false);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "تعذر رفع الملف — تأكد من اتصال قاعدة البيانات",
          );
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError("تعذر قراءة الملف");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر رفع الملف",
      );
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
