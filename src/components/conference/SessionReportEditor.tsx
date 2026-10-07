"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Save,
  Loader2,
  Check,
  Lock,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { SessionReport } from "@/types";

interface SessionReportEditorProps {
  trackId: number;
  trackTitle: string;
  chairName?: string;
}

export function SessionReportEditor({
  trackId,
  trackTitle,
  chairName,
}: SessionReportEditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setContent("");
    setError(null);
    fetch(`/api/sessions/${trackId}/report`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as SessionReport;
        if (!active) return;
        setContent(data.content ?? "");
      })
      .catch(() => {
        if (active) setError("تعذر تحميل التقرير");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trackId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${trackId}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, editedBy: chairName }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedAt(new Date());
    } catch {
      setError("تعذر حفظ التقرير");
    } finally {
      setSaving(false);
    }
  }, [trackId, content, chairName]);

  const handleAiGenerate = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, notes: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      if (data.report) {
        setContent(data.report);
      }
    } catch (e) {
      setAiError("تعذر توليد التقرير. حاول مرة أخرى.");
    } finally {
      setAiLoading(false);
    }
  }, [trackId, content]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold" dir="rtl">
              تقرير رئيس الجلسة
            </h3>
            <p className="truncate text-xs text-white/70" dir="rtl">
              {trackTitle}
            </p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/85"
          dir="rtl"
          title="هذا التقرير خاص ولا يظهر للزوار"
        >
          <Lock className="h-3 w-3" aria-hidden />
          خاص
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm" dir="rtl">
              جاري التحميل...
            </span>
          </div>
        ) : (
          <>
            {/* Chair name display */}
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#6B7280]" dir="rtl">
                  رئيس الجلسة
                </p>
                <p className="truncate text-sm font-bold text-[#0B1B3D]" dir="rtl">
                  {chairName || "—"}
                </p>
              </div>
            </div>

            {/* Report content */}
            <div>
              <label
                htmlFor={`report-content-${trackId}`}
                className="mb-1 block text-xs font-semibold text-[#0B1B3D]"
                dir="rtl"
              >
                الملاحظات والتقرير
              </label>
              <textarea
                id={`report-content-${trackId}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="اكتب ملاحظاتك حول الجلسة، الأوراق المقدمة، التوصيات... أو استخدم المساعد الذكي لتوليد التقرير"
                dir="rtl"
                className="scroll-elegant w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4 text-sm leading-relaxed text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* AI generate button */}
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-3">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-4 text-sm font-bold text-[#D4AF37] shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                dir="rtl"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    جاري تحليل الأوراق وتوليد التقرير...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    توليد التقرير بالذكاء الاصطناعي
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-[#9CA3AF]" dir="rtl">
                يحلل بيانات الجلسة + الأوراق البحثية + ملاحظاتك ويصيغ تقريراً احترافياً
              </p>
              {aiError && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#B91C1C]" dir="rtl">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  {aiError}
                </p>
              )}
            </div>

            {/* Footer: save + status */}
            <div className="flex items-center justify-between gap-3">
              {error ? (
                <p className="text-xs font-semibold text-[#B91C1C]" dir="rtl">
                  {error}
                </p>
              ) : savedAt ? (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-green-600" dir="rtl">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  تم الحفظ — {savedAt.toLocaleTimeString("ar")}
                </p>
              ) : (
                <p className="text-xs text-[#9CA3AF]" dir="rtl">
                  يحفظ باسم رئيس الجلسة في قاعدة البيانات
                </p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#07152F] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                حفظ التقرير
              </button>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}
