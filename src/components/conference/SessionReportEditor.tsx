"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Save,
  Loader2,
  Check,
  Lock,
  User,
  Sparkles,
  AlertCircle,
  FileText,
  Brain,
  X,
} from "lucide-react";
import type { SessionReport, ResearchPaper } from "@/types";
import { AiAgentChat } from "./AiAgentChat";

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
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  // selectedPaperSlot: 0 = general report, 1-5 = specific paper report.
  // This is used BOTH for the report editor (which paper's report to load/save)
  // AND for the AI generate (which paper to analyze).
  const [selectedPaperSlot, setSelectedPaperSlot] = useState<number>(0);
  const [agentOpen, setAgentOpen] = useState(false);

  // Load session papers once when trackId changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSelectedPaperSlot(0);

    fetch(`/api/sessions/${trackId}`, { cache: "no-store" })
      .then(async (r) => r.json())
      .then((sessionData) => {
        if (!active) return;
        setPapers(sessionData.papers ?? []);
      })
      .catch(() => {
        if (active) setError("تعذر تحميل البيانات");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trackId]);

  // Load report when trackId OR selectedPaperSlot changes.
  useEffect(() => {
    let active = true;
    if (loading) return; // Wait for papers to load first.
    const slotParam = selectedPaperSlot > 0 ? `?paperSlot=${selectedPaperSlot}` : "";
    fetch(`/api/sessions/${trackId}/report${slotParam}`, { cache: "no-store" })
      .then(async (r) => r.json())
      .then((reportData) => {
        if (!active) return;
        setContent(reportData.content ?? "");
      })
      .catch(() => {
        if (active) {
          setContent("");
        }
      });
    return () => {
      active = false;
    };
  }, [trackId, selectedPaperSlot, loading]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${trackId}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          editedBy: chairName,
          paperSlot: selectedPaperSlot,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setSavedAt(new Date());
    } catch (e) {
      setError(
        e instanceof Error
          ? `تعذر حفظ التقرير: ${e.message}`
          : "تعذر حفظ التقرير",
      );
    } finally {
      setSaving(false);
    }
  }, [trackId, content, chairName, selectedPaperSlot]);

  const handleAiGenerate = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId,
          notes: content,
          paperSlot: selectedPaperSlot || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      if (data.report) {
        setContent(data.report);
      }
    } catch {
      setAiError("تعذر توليد التقرير. حاول مرة أخرى.");
    } finally {
      setAiLoading(false);
    }
  }, [trackId, content, selectedPaperSlot]);

  // Quick AI action (summarize, format, extract, evaluate).
  // Sends a one-shot request to the agent API with a specific instruction.
  const handleAgentAction = useCallback(
    async (instruction: string) => {
      setAiLoading(true);
      setAiError(null);
      try {
        const res = await fetch("/api/ai/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId,
            mode: "report",
            currentReport: content,
            messages: [{ role: "user", content: instruction }],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "failed");
        // If the agent returned a suggested report, apply it directly.
        if (data.suggestedReport) {
          setContent(data.suggestedReport);
        } else if (data.reply) {
          // Otherwise, append the reply to the current content.
          setContent((prev) => prev + "\n\n" + data.reply);
        }
      } catch {
        setAiError("تعذر تنفيذ العملية. حاول مرة أخرى.");
      } finally {
        setAiLoading(false);
      }
    },
    [trackId, content],
  );

  // Papers with titles for the selector.
  const papersWithTitles = papers.filter((p) => p.title);

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
            <span className="text-sm" dir="rtl">جاري التحميل...</span>
          </div>
        ) : (
          <>
            {/* Chair name */}
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#6B7280]" dir="rtl">رئيس الجلسة</p>
                <p className="truncate text-sm font-bold text-[#0B1B3D]" dir="rtl">
                  {chairName || "—"}
                </p>
              </div>
            </div>

            {/* Paper selector — controls BOTH which report to edit AND which paper AI analyzes */}
            <div>
              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#0B1B3D]"
                dir="rtl"
              >
                <FileText className="h-4 w-4 text-[#D4AF37]" />
                {selectedPaperSlot > 0 ? "تقرير الورقة المحددة" : "التقرير العام للمحور"}
              </label>
              <select
                value={selectedPaperSlot}
                onChange={(e) => {
                  setSelectedPaperSlot(parseInt(e.target.value, 10));
                  setSavedAt(null);
                }}
                dir="rtl"
                className="h-12 w-full appearance-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                <option value={0}>تقرير عام عن المحور (شامل)</option>
                {papers.map((p) => {
                  const researchers = (p.researcher ?? "")
                    .split("\n")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                    .join("، ");
                  return (
                    <option key={p.slot} value={p.slot}>
                      تقرير الورقة {p.slot}
                      {p.title ? `: ${p.title}` : ""}
                      {researchers ? ` — ${researchers}` : ""}
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-[10px] text-[#9CA3AF]" dir="rtl">
                {selectedPaperSlot > 0
                  ? "أنت تحرر تقرير ورقة محددة — يُحفظ منفصلاً عن التقرير العام"
                  : "أنت تحرر التقرير العام للمحور — منفصل عن تقارير الأوراق الفردية"}
              </p>
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
                rows={12}
                placeholder="اكتب ملاحظاتك حول الجلسة، الأوراق المقدمة، التوصيات... أو استخدم المساعد الذكي لتوليد التقرير"
                dir="rtl"
                className="scroll-elegant w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4 text-sm leading-relaxed text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* AI tools */}
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-3">
              <p className="mb-2 text-[10px] font-bold text-[#9CA3AF]" dir="rtl">
                أدوات أمين السر الذكية
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {/* Generate full report */}
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-2 text-[11px] font-bold text-[#D4AF37] transition-all hover:shadow-md disabled:opacity-50"
                  dir="rtl"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  )}
                  توليد التقرير
                </button>
                {/* Summarize */}
                <button
                  type="button"
                  onClick={() => handleAgentAction("لخّص التقرير الحالي في نقاط مختصرة ومحددة.")}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-white px-2 text-[11px] font-bold text-[#0B1B3D] transition-all hover:bg-[#F4ECD0] disabled:opacity-50"
                  dir="rtl"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  تلخيص
                </button>
                {/* Format as document */}
                <button
                  type="button"
                  onClick={() => handleAgentAction("أعد تنسيق التقرير الحالي كوثيقة علمية رسمية بترقيم علمي (أولاً، ثانياً، ثالثاً) بدون أي رموز زخرفية.")}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-white px-2 text-[11px] font-bold text-[#0B1B3D] transition-all hover:bg-[#F4ECD0] disabled:opacity-50"
                  dir="rtl"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  تنسيق وثيقة
                </button>
                {/* Extract recommendations */}
                <button
                  type="button"
                  onClick={() => handleAgentAction("استخرج جميع التوصيات من التقرير الحالي واعرضها في قائمة مرقمة واضحة.")}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-white px-2 text-[11px] font-bold text-[#0B1B3D] transition-all hover:bg-[#F4ECD0] disabled:opacity-50"
                  dir="rtl"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  استخراج التوصيات
                </button>
                {/* Evaluate papers */}
                <button
                  type="button"
                  onClick={() => handleAgentAction("قيّم الأوراق البحثية المقدمة في الجلسة: اذكر لكل ورقة نقاط القوة والملاحظات البناءة.")}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-white px-2 text-[11px] font-bold text-[#0B1B3D] transition-all hover:bg-[#F4ECD0] disabled:opacity-50"
                  dir="rtl"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  تقييم الأوراق
                </button>
                {/* Open interactive agent */}
                <button
                  type="button"
                  onClick={() => setAgentOpen(true)}
                  disabled={aiLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37] bg-[#0B1B3D] px-2 text-[11px] font-bold text-white transition-all hover:bg-[#07152F] disabled:opacity-50"
                  dir="rtl"
                >
                  <Brain className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  محادثة المفكّر
                </button>
              </div>
              {aiError && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#B91C1C]" dir="rtl">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  {aiError}
                </p>
              )}
            </div>

            {/* Save */}
            <div className="flex items-center justify-between gap-3">
              {error ? (
                <p className="text-xs font-semibold text-[#B91C1C]" dir="rtl">{error}</p>
              ) : savedAt ? (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-green-600" dir="rtl">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  تم الحفظ — {savedAt.toLocaleTimeString("ar")}
                </p>
              ) : (
                <p className="text-xs text-[#9CA3AF]" dir="rtl">يحفظ باسم رئيس الجلسة في قاعدة البيانات</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#07152F] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                حفظ التقرير
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── AI Agent sliding panel (the "thinker") ── */}
      <AnimatePresence>
        {agentOpen && !loading && (
          <motion.div
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="المفكّر — الوكيل الذكي"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-[#07152F]/70 backdrop-blur-sm"
              onClick={() => setAgentOpen(false)}
              aria-hidden
            />

            {/* Panel — slides in from the left (RTL: from the left edge) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative flex h-full w-full max-w-md flex-col p-3 sm:p-4"
            >
              {/* Close button (floating, top-right) */}
              <button
                type="button"
                onClick={() => setAgentOpen(false)}
                aria-label="إغلاق"
                className="absolute -top-1 -right-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1B3D] text-white shadow-lg transition-colors hover:bg-[#B91C1C]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>

              {/* The chat fills the panel */}
              <AiAgentChat
                trackId={trackId}
                mode="report"
                currentReport={content}
                onApplyReport={(report) => {
                  setContent(report);
                  setAgentOpen(false);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
