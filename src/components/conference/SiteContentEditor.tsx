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
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { CONTENT_DEFAULTS } from "@/lib/site-content-server";
import { tracks } from "@/lib/tracks";
import { conferenceInfo, schedule } from "@/lib/conference-info";

/**
 * Admin tab — "محتوى الموقع".
 *
 * Lets the admin edit every word on the public site:
 *   - Conference meta (title / subtitle / tagline / dates / venue / city / about)
 *   - Track titles + subtitles
 *   - Schedule (day labels, dates, session times/titles/speakers)
 *
 * Saves via PUT /api/site-content (bulk). Values persist in the DB
 * (SiteContent table) and override the static defaults.
 */
export function SiteContentEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"conference" | "tracks" | "schedule">(
    "conference",
  );

  // Load current values (DB overrides defaults).
  useEffect(() => {
    let active = true;
    setLoading(true);
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
    } catch {
      setError("تعذر الحفظ — تأكد من اتصال قاعدة البيانات");
    } finally {
      setSaving(false);
    }
  }, [values]);

  const get = (key: string) => values[key] ?? CONTENT_DEFAULTS[key] ?? "";

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
            <Section title="مسميات المحاور" icon={Layers3}>
              {tracks.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2"
                >
                  <Field
                    label={`المحور ${t.id} — العنوان`}
                    value={get(`track.${t.id}.title`)}
                    onChange={(v) => set(`track.${t.id}.title`, v)}
                  />
                  <Field
                    label={`المحور ${t.id} — الوصف`}
                    value={get(`track.${t.id}.subtitle`)}
                    onChange={(v) => set(`track.${t.id}.subtitle`, v)}
                  />
                </div>
              ))}
            </Section>
          )}

          {/* SCHEDULE */}
          {section === "schedule" && (
            <Section title="برنامج المؤتمر" icon={CalendarDays}>
              {schedule.map((day, di) => {
                // Read the dynamic session count for this day from the content map.
                const sessionCount = Math.max(
                  0,
                  parseInt(get(`schedule.day${di + 1}.count`), 10) || 0,
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
                          // Add a new empty session at the end.
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
                                // Delete this session: shift subsequent sessions down + decrement count.
                                const updated = { ...values };
                                for (let j = si; j < sessionCount - 1; j++) {
                                  const src = `schedule.day${di + 1}.session.${j + 1}`;
                                  const dst = `schedule.day${di + 1}.session.${j}`;
                                  for (const k of ["time", "title", "speaker", "type", "trackId"]) {
                                    updated[`${dst}.${k}`] = values[`${src}.${k}`] ?? "";
                                  }
                                }
                                // Clear the last slot (now duplicated into second-to-last).
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
                                {tracks.map((t) => (
                                  <option key={t.id} value={String(t.id)}>
                                    المحور {t.id}
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
                <FileText className="h-3.5 w-3.5" />
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
