"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  Check,
  AlertCircle,
  Type,
  CalendarDays,
  Layers3,
  Plus,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { CONTENT_DEFAULTS } from "@/lib/site-content-server";
import { tracks } from "@/lib/tracks";
import { conferenceInfo, schedule } from "@/lib/conference-info";
import { useSiteContentValue } from "./SiteContentProvider";

/**
 * Admin tab — "محتوى الموقع".
 *
 * Lets the admin edit every word on the public site:
 *   - Conference meta (title / subtitle / tagline / dates / venue / city / about)
 *   - Track titles + subtitles (+ add/delete tracks)
 *   - Schedule (day labels, dates, session times/titles/speakers)
 *
 * Saving triggers a global content reload so changes reflect on the public
 * site instantly (no manual page refresh needed).
 */
export function SiteContentEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"conference" | "tracks" | "schedule">(
    "tracks",
  );
  const [trackBusy, setTrackBusy] = useState<"add" | number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    trackId: number;
    title: string;
  } | null>(null);

  // Read the global reload + setMany so we can refresh the public site's
  // content after the admin saves or adds/deletes a track (optimistic + fetch).
  // Also read the live `content` map so we can initialize `values` from it
  // (keeps the editor's state in sync when tracks are added/deleted elsewhere
  // or when the component re-mounts after switching tabs).
  const {
    content: globalContent,
    reload: reloadGlobal,
    setMany: setManyGlobal,
    deleteMany: deleteManyGlobal,
  } = useSiteContentValue();

  /** Clear sessionStorage overrides + reload from the API.
   * On Vercel: the PUT already persisted to the DB, so reloading fetches the
   * fresh values. The optimistic setManyGlobal keeps the UI working during
   * the brief fetch.
   */
  const clearAndReload = useCallback(() => {
    // Optimistically apply the saved values (for instant UI feedback).
    setManyGlobal(values);
    // Then reload from the API to get the persisted DB values.
    // The reload clears sessionStorage + re-fetches, replacing the optimistic
    // values with the real DB values.
    reloadGlobal();
  }, [values, setManyGlobal, reloadGlobal]);

  // Load current values (DB overrides defaults). On mount, initialize from
  // the global context if it has data (so we don't clobber optimistic updates
  // from a previous mount with a fresh fetch that returns defaults).
  useEffect(() => {
    let active = true;
    setLoading(true);

    // If the global context already has content (e.g. the user added tracks
    // then switched tabs and came back), use it as the initial values instead
    // of re-fetching (which would return the static defaults in local dev).
    const hasGlobalContent =
      globalContent &&
      typeof globalContent === "object" &&
      Object.keys(globalContent).length > 0;

    if (hasGlobalContent) {
      // Merge global content over defaults so the editor sees the latest
      // optimistic state.
      setValues({ ...CONTENT_DEFAULTS, ...globalContent });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetch("/api/site-content", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        setValues(data ?? CONTENT_DEFAULTS);
      })
      .catch(() => {
        if (active) setValues(CONTENT_DEFAULTS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const set = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedAt(new Date());
      // On Vercel: the PUT persisted to the DB. Clear sessionStorage overrides
      // + reload from the API so all pages see the fresh DB values.
      // On local dev (no DB): the optimistic setManyGlobal keeps the UI working.
      clearAndReload();
    } catch {
      setError("تعذر الحفظ — تأكد من اتصال قاعدة البيانات");
    } finally {
      setSaving(false);
    }
  }, [values, clearAndReload]);

  const get = (key: string) => values[key] ?? CONTENT_DEFAULTS[key] ?? "";

  // ── Add a new track (POST /api/admin/tracks) ──
  const handleAddTrack = useCallback(async () => {
    setTrackBusy("add");
    setError(null);
    try {
      // Read the latest count from the global context (which is always
      // up-to-date because it's the single source of truth).
      const currentCount =
        parseInt(globalContent?.["tracks.count"] ?? "", 10) ||
        parseInt(values["tracks.count"] ?? String(tracks.length), 10) ||
        tracks.length;
      const newId = currentCount + 1;

      // Update local editor state.
      setValues((prev) => ({
        ...prev,
        "tracks.count": String(newId),
        [`track.${newId}.title`]: `المحور ${newId}`,
        [`track.${newId}.subtitle`]: "",
      }));

      // Fire the server request to persist (no-op locally without DB).
      const res = await fetch("/api/admin/tracks", { method: "POST" });
      if (!res.ok) throw new Error("add failed");

      // Optimistically merge into the global context so ALL pages (admin
      // session tab, public site, /qn) see the new track IMMEDIATELY.
      setManyGlobal({
        "tracks.count": String(newId),
        [`track.${newId}.title`]: `المحور ${newId}`,
        [`track.${newId}.subtitle`]: "",
      });
    } catch {
      setError("تعذر إضافة المحور — تأكد من اتصال قاعدة البيانات");
    } finally {
      setTrackBusy(null);
    }
  }, [setManyGlobal, globalContent, values]);

  // ── Request delete a track (opens a confirmation dialog) ──
  const requestDeleteTrack = useCallback(
    (trackId: number) => {
      const count = parseInt(get("tracks.count"), 10) || tracks.length;
      if (count <= 1) {
        setError("لا يمكن حذف المحور الأخير — يجب أن يبقى محور واحد على الأقل");
        return;
      }
      const title = get(`track.${trackId}.title`) || `المحور ${trackId}`;
      setPendingDelete({ trackId, title });
    },
    [values],
  );

  // ── Actually delete the track (called when the user confirms the dialog) ──
  const confirmDeleteTrack = useCallback(async () => {
    if (!pendingDelete) return;
    const trackId = pendingDelete.trackId;
    setPendingDelete(null);

    const count = parseInt(get("tracks.count"), 10) || tracks.length;
    setTrackBusy(trackId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");

      // Build the post-delete renumbered content map locally so the UI
      // updates immediately (without waiting for a server round-trip).
      const newCount = count - 1;
      const updated: Record<string, string> = { "tracks.count": String(newCount) };
      // Renumber: for each track id > trackId, shift down by 1.
      for (let newId = trackId; newId <= newCount; newId++) {
        const oldId = newId + 1;
        updated[`track.${newId}.title`] = get(`track.${oldId}.title`);
        updated[`track.${newId}.subtitle`] = get(`track.${oldId}.subtitle`);
      }
      // Keys to delete from the global context (the old last track's keys).
      const keysToDelete: string[] = [
        `track.${count}.title`,
        `track.${count}.subtitle`,
        `track.${count}.icon`,
      ];

      // Update local editor state.
      const freshValues: Record<string, string> = { ...values };
      for (const [k, v] of Object.entries(updated)) freshValues[k] = v;
      for (const k of keysToDelete) delete freshValues[k];
      setValues(freshValues);

      // Optimistically update the global context (no server re-fetch —
      // that would clobber the optimistic state in local dev).
      setManyGlobal(updated);
      deleteManyGlobal(keysToDelete);
    } catch {
      setError("تعذر حذف المحور — تأكد من اتصال قاعدة البيانات");
    } finally {
      setTrackBusy(null);
    }
  }, [pendingDelete, setManyGlobal, deleteManyGlobal, values]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={section === "conference"}
          onClick={() => setSection("conference")}
          icon={Type}
          label="بيانات المؤتمر"
        />
        <TabButton
          active={section === "tracks"}
          onClick={() => setSection("tracks")}
          icon={Layers3}
          label="المحاور"
        />
        <TabButton
          active={section === "schedule"}
          onClick={() => setSection("schedule")}
          icon={CalendarDays}
          label="البرنامج"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
          <span className="text-sm" dir="rtl">
            جاري التحميل...
          </span>
        </div>
      ) : (
        <>
          {/* CONFERENCE */}
          {section === "conference" && (
            <Section title="بيانات المؤتمر" icon={Type}>
              <Field
                label="اسم الأكاديمية"
                value={get("conference.academy")}
                onChange={(v) => set("conference.academy", v)}
              />
              <Field
                label="عنوان المؤتمر"
                value={get("conference.title")}
                onChange={(v) => set("conference.title", v)}
              />
              <Field
                label="العنوان الفرعي"
                value={get("conference.subtitle")}
                onChange={(v) => set("conference.subtitle", v)}
              />
              <Field
                label="الشعار / العبارة"
                value={get("conference.tagline")}
                onChange={(v) => set("conference.tagline", v)}
              />
              <Field
                label="النسخة"
                value={get("conference.edition")}
                onChange={(v) => set("conference.edition", v)}
              />
              <Field
                label="تاريخ الانعقاد"
                value={get("conference.dates")}
                onChange={(v) => set("conference.dates", v)}
              />
              <Field
                label="المدة"
                value={get("conference.duration")}
                onChange={(v) => set("conference.duration", v)}
              />
              <Field
                label="المكان"
                value={get("conference.venue")}
                onChange={(v) => set("conference.venue", v)}
              />
              <Field
                label="المدينة"
                value={get("conference.city")}
                onChange={(v) => set("conference.city", v)}
              />
              {/* Stats */}
              {conferenceInfo.stats.map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-3 sm:col-span-2"
                >
                  <Field
                    label={`الإحصائية ${i + 1} — القيمة`}
                    value={get(`conference.stats.${i}.value`)}
                    onChange={(v) => set(`conference.stats.${i}.value`, v)}
                  />
                  <Field
                    label={`الإحصائية ${i + 1} — الوصف`}
                    value={get(`conference.stats.${i}.label`)}
                    onChange={(v) => set(`conference.stats.${i}.label`, v)}
                  />
                </div>
              ))}
              {/* About paragraphs */}
              <div className="sm:col-span-2">
                <p
                  className="mb-2 mt-2 text-xs font-bold text-[#0B1B3D]"
                  dir="rtl"
                >
                  فقرات «عن المؤتمر»
                </p>
                {conferenceInfo.about.map((_, i) => (
                  <div key={i} className="mb-2">
                    <label
                      className="mb-1 block text-[11px] text-[#6B7280]"
                      dir="rtl"
                    >
                      الفقرة {i + 1}
                    </label>
                    <textarea
                      value={get(`conference.about.${i}`)}
                      onChange={(e) => set(`conference.about.${i}`, e.target.value)}
                      rows={3}
                      dir="rtl"
                      className="w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* TRACKS */}
          {section === "tracks" && (
            <Section title="إدارة المحاور" icon={Layers3}>
              {/* Track count + add button */}
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4">
                <div>
                  <p className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                    عدد المحاور: {parseInt(get("tracks.count"), 10) || tracks.length}
                  </p>
                  <p className="text-xs text-[#6B7280]" dir="rtl">
                    أضف محورًا جديدًا أو احذف محورًا موجودًا — تنعكس التغييرات على كل الصفحات فورًا
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTrack}
                  disabled={trackBusy !== null}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B1B3D] px-4 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#07152F] disabled:opacity-50"
                  dir="rtl"
                >
                  {trackBusy === "add" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  إضافة محور جديد
                </button>
              </div>

              {/* Dynamic track editors with delete buttons */}
              {Array.from(
                { length: Math.max(1, parseInt(get("tracks.count"), 10) || tracks.length) },
                (_, i) => i + 1,
              ).map((id) => (
                <div
                  key={id}
                  className="sm:col-span-2 rounded-xl border border-[#E2E5EC] bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B1B3D] text-xs font-bold text-[#D4AF37]">
                      {id}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteTrack(id)}
                      disabled={trackBusy !== null}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-[#B91C1C] transition-colors hover:bg-red-100 disabled:opacity-50"
                      dir="rtl"
                    >
                      {trackBusy === id ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3 w-3" aria-hidden />
                      )}
                      حذف المحور
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label={`العنوان`}
                      value={get(`track.${id}.title`) || `المحور ${id}`}
                      onChange={(v) => set(`track.${id}.title`, v)}
                    />
                    <Field
                      label={`الوصف`}
                      value={get(`track.${id}.subtitle`) || ""}
                      onChange={(v) => set(`track.${id}.subtitle`, v)}
                    />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* SCHEDULE */}
          {section === "schedule" && (
            <Section title="برنامج المؤتمر" icon={CalendarDays}>
              {/* Track-aware session.trackId dropdown will use dynamic count */}
              {schedule.map((day, di) => {
                const sessionCount = Math.max(
                  0,
                  parseInt(get(`schedule.day${di + 1}.count`), 10) || 0,
                );
                const currentTrackCount = Math.max(
                  1,
                  parseInt(get("tracks.count"), 10) || tracks.length,
                );
                return (
                  <div
                    key={di}
                    className="sm:col-span-2 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4"
                  >
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <Field
                        label={`اليوم ${di + 1} — المسمى`}
                        value={get(`schedule.day${di + 1}.label`)}
                        onChange={(v) => set(`schedule.day${di + 1}.label`, v)}
                      />
                      <Field
                        label={`اليوم ${di + 1} — التاريخ`}
                        value={get(`schedule.day${di + 1}.date`)}
                        onChange={(v) => set(`schedule.day${di + 1}.date`, v)}
                      />
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0B1B3D]" dir="rtl">
                        الجلسات ({sessionCount})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const newIdx = sessionCount;
                          set(`schedule.day${di + 1}.session.${newIdx}.time`, "٩:٠٠ ص");
                          set(`schedule.day${di + 1}.session.${newIdx}.title`, "جلسة جديدة");
                          set(`schedule.day${di + 1}.session.${newIdx}.speaker`, "");
                          set(`schedule.day${di + 1}.session.${newIdx}.type`, "session");
                          set(`schedule.day${di + 1}.session.${newIdx}.trackId`, "");
                          set(`schedule.day${di + 1}.count`, String(newIdx + 1));
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B1B3D] px-3 text-xs font-bold text-white transition-colors hover:bg-[#07152F]"
                        dir="rtl"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        إضافة جلسة
                      </button>
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: sessionCount }, (_, si) => (
                        <div
                          key={si}
                          className="rounded-lg border border-[#E2E5EC] bg-white p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B1B3D] text-[10px] font-bold text-[#D4AF37]"
                              dir="rtl"
                            >
                              {si + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...values };
                                for (let j = si; j < sessionCount - 1; j++) {
                                  const src = `schedule.day${di + 1}.session.${j + 1}`;
                                  const dst = `schedule.day${di + 1}.session.${j}`;
                                  for (const k of ["time", "title", "speaker", "type", "trackId"]) {
                                    updated[`${dst}.${k}`] = values[`${src}.${k}`] ?? "";
                                  }
                                }
                                const last = sessionCount - 1;
                                for (const k of ["time", "title", "speaker", "type", "trackId"]) {
                                  updated[`schedule.day${di + 1}.session.${last}.${k}`] = "";
                                }
                                updated[`schedule.day${di + 1}.count`] = String(last);
                                setValues(updated);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-[#B91C1C] transition-colors hover:bg-red-100"
                              dir="rtl"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden />
                              حذف
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Field
                              label="التوقيت"
                              value={get(`schedule.day${di + 1}.session.${si}.time`)}
                              onChange={(v) =>
                                set(`schedule.day${di + 1}.session.${si}.time`, v)
                              }
                            />
                            <div className="sm:col-span-2">
                              <Field
                                label="العنوان"
                                value={get(`schedule.day${di + 1}.session.${si}.title`)}
                                onChange={(v) =>
                                  set(`schedule.day${di + 1}.session.${si}.title`, v)
                                }
                              />
                            </div>
                            <Field
                              label="المتحدث"
                              value={get(`schedule.day${di + 1}.session.${si}.speaker`)}
                              onChange={(v) =>
                                set(`schedule.day${di + 1}.session.${si}.speaker`, v)
                              }
                            />
                            <div>
                              <label
                                className="mb-1 block text-xs font-semibold text-[#0B1B3D]"
                                dir="rtl"
                              >
                                النوع
                              </label>
                              <select
                                value={get(`schedule.day${di + 1}.session.${si}.type`)}
                                onChange={(e) =>
                                  set(`schedule.day${di + 1}.session.${si}.type`, e.target.value)
                                }
                                dir="rtl"
                                className="h-11 w-full appearance-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                              >
                                <option value="keynote">كلمة رئيسية</option>
                                <option value="session">جلسة علمية</option>
                                <option value="break">استراحة</option>
                                <option value="panel">ندوة حوارية</option>
                              </select>
                            </div>
                            <div>
                              <label
                                className="mb-1 block text-xs font-semibold text-[#0B1B3D]"
                                dir="rtl"
                              >
                                المحور (اختياري)
                              </label>
                              <select
                                value={get(`schedule.day${di + 1}.session.${si}.trackId`)}
                                onChange={(e) =>
                                  set(`schedule.day${di + 1}.session.${si}.trackId`, e.target.value)
                                }
                                dir="rtl"
                                className="h-11 w-full appearance-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                              >
                                <option value="">— بدون محور —</option>
                                {Array.from({ length: currentTrackCount }, (_, k) => k + 1).map((tid) => (
                                  <option key={tid} value={String(tid)}>
                                    {get(`track.${tid}.title`) || `المحور ${tid}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Save bar */}
          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-lg">
            {savedAt ? (
              <p
                className="inline-flex items-center gap-1 text-sm font-medium text-green-600"
                dir="rtl"
              >
                <Check className="h-4 w-4" aria-hidden />
                تم الحفظ — {savedAt.toLocaleTimeString("ar")}
              </p>
            ) : error ? (
              <p className="flex items-center gap-1 text-sm font-semibold text-[#B91C1C]" dir="rtl">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-[#9CA3AF]" dir="rtl">
                <CalendarDays className="h-3.5 w-3.5" />
                التغييرات تنعكس على الموقع فور الحفظ
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
              حفظ التغييرات
            </button>
          </div>
        </>
      )}

      {/* Delete-track confirmation dialog (replaces window.confirm — works in
          headless browsers + better UX with styled buttons). */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle dir="rtl" className="text-right">
              حذف «{pendingDelete?.title ?? ""}»؟
            </AlertDialogTitle>
            <AlertDialogDescription dir="rtl" className="text-right">
              سيتم حذف جميع بيانات هذا المحور (الجلسة، الأوراق البحثية، الأسئلة،
              التقرير) نهائيًا، وسيتم إعادة ترقيم المحاور التالية. لا يمكن
              التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="rtl-order-cancel"
              onClick={() => setPendingDelete(null)}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B91C1C] text-white hover:bg-[#991B1B]"
              onClick={confirmDeleteTrack}
            >
              {trackBusy !== null ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="ml-2 h-4 w-4" aria-hidden />
                  نعم، احذف
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

/** A section card with a header. */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Type;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
        <Icon className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

/** A labeled text input. */
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        dir="rtl"
        className="h-11 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] transition-colors focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
      />
    </div>
  );
}

/** A section tab button. */
function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Type;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all",
        active
          ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
          : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
      ].join(" ")}
      dir="rtl"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
