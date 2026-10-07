"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Send,
  Loader2,
  Check,
  AlertCircle,
  MessageCircleQuestion,
  ArrowRight,
  Sparkles,
  Wand2,
  X,
  FileText,
} from "lucide-react";
import { tracks, getTrackById } from "@/lib/tracks";
import { TrackIcon, getTrackGradient } from "@/components/conference/TrackIcon";
import { useSiteContentValue } from "@/components/conference/SiteContentProvider";

/**
 * Public audience question-submission page (/qn).
 *
 * Features:
 *   1. Track selector (5 tracks, dynamic titles from DB)
 *   2. Author name (optional)
 *   3. Question textarea
 *   4. AI Assistant — refines/summarizes the question based on the track
 *   5. Submit → saved to DB → appears on the main site for the chair
 *
 * This page does NOT display questions — it's submission-only.
 */
export default function QnPage() {
  const { get } = useSiteContentValue();
  const [trackId, setTrackId] = useState<number>(0); // 0 = not selected yet
  const [trackConfirmed, setTrackConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [paperSlot, setPaperSlot] = useState<number>(0); // 0 = عام (no specific paper)
  const [papers, setPapers] = useState<{ slot: number; title?: string; researcher?: string }[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  // AI assistant state.
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [aiRefined, setAiRefined] = useState("");
  const [aiNote, setAiNote] = useState("");

  // Fetch papers when track is confirmed.
  useEffect(() => {
    if (!trackConfirmed || trackId === 0) return;
    setPapersLoading(true);
    setPaperSlot(0);
    fetch(`/api/sessions/${trackId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        setPapers(data.papers ?? []);
      })
      .catch(() => setPapers([]))
      .finally(() => setPapersLoading(false));
  }, [trackId, trackConfirmed]);

  const handleAiRefine = useCallback(async () => {
    if (!question.trim() || question.trim().length < 5 || aiStatus === "loading")
      return;
    setAiStatus("loading");
    setAiRefined("");
    setAiNote("");
    try {
      const res = await fetch("/api/ai/refine-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, question: question.trim(), paperSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setAiRefined(data.refined);
      setAiNote(data.note);
      setAiStatus("done");
    } catch {
      setAiStatus("error");
      setTimeout(() => setAiStatus("idle"), 4000);
    }
  }, [trackId, question, aiStatus, paperSlot]);

  const useRefined = useCallback(() => {
    if (aiRefined) {
      setQuestion(aiRefined);
      setAiStatus("idle");
      setAiRefined("");
      setAiNote("");
    }
  }, [aiRefined]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!question.trim() || status === "sending") return;
      setStatus("sending");
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId,
            question: question.trim(),
            author: name.trim() || undefined,
            paperSlot: paperSlot || undefined,
          }),
        });
        if (!res.ok) throw new Error("failed");
        setStatus("sent");
        setQuestion("");
        setName("");
        setAiStatus("idle");
        setAiRefined("");
        setTimeout(() => setStatus("idle"), 4000);
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    },
    [trackId, question, name, status],
  );

  // Build dynamic tracks list from content (same as main site).
  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", String(tracks.length)), 10) || tracks.length,
  );
  const dynamicTracks = Array.from({ length: trackCount }, (_, i) => {
    const id = i + 1;
    const staticTrack = getTrackById(id);
    return {
      id,
      title: get(`track.${id}.title`, staticTrack?.title ?? `المحور ${id}`),
      subtitle: get(`track.${id}.subtitle`, staticTrack?.subtitle ?? ""),
      icon: (get(`track.${id}.icon`, staticTrack?.icon ?? "law") as typeof staticTrack extends { icon: infer I } ? I : "law") ?? "law",
      folder: staticTrack?.folder ?? `track-${id}`,
      sessionId: staticTrack?.sessionId ?? `track-${id}`,
    };
  });

  const selectedTrack = trackId > 0
    ? dynamicTracks.find((t) => t.id === trackId)
    : null;
  const gradient = getTrackGradient(selectedTrack?.icon ?? "law");
  const conferenceTitle = get("conference.title", "المؤتمر العلمي الدولي الثالث");
  const conferenceSubtitle = get("conference.subtitle", "الجرائم العابرة للحدود");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1B3D] via-[#0B1B3D] to-[#07152F] px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="geometric-pattern pointer-events-none fixed inset-0 opacity-40"
      />

      <div className="relative mx-auto max-w-2xl">
        {/* Logo + title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="relative mb-4">
            <div className="absolute -inset-2 rounded-full bg-[#D4AF37]/10 blur-xl" />
            <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-[#D4AF37]/30 ring-offset-2 ring-offset-[#0B1B3D]">
              <Image
                src="/logo/academy-logo.png"
                alt="شعار أكاديمية السلطان قابوس لعلوم الشرطة"
                fill
                priority
                sizes="80px"
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-xs font-medium tracking-wide text-white/60">
            أكاديمية السلطان قابوس لعلوم الشرطة
          </p>
          <h1
            className="mt-2 text-xl font-extrabold text-[#D4AF37] sm:text-2xl"
            dir="rtl"
          >
            {conferenceTitle}
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/80 sm:text-base" dir="rtl">
            {conferenceSubtitle}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" />
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
          </div>
          <p className="mt-4 text-sm text-white/70" dir="rtl">
            اطرح سؤالك على رئيس الجلسة
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          {/* Card header */}
          <div className={`bg-gradient-to-l ${gradient} px-6 py-4 text-white transition-all duration-300`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <MessageCircleQuestion className="h-5 w-5" aria-hidden />
              </span>
              <div className="flex-1">
                <h2 className="text-base font-bold" dir="rtl">
                  {trackConfirmed && selectedTrack ? selectedTrack.title : "طرح سؤال"}
                </h2>
                <p className="text-xs text-white/80" dir="rtl">
                  {trackConfirmed
                    ? `المحور ${trackId} — ${selectedTrack?.subtitle ?? ""}`
                    : "اختر المحور أولاً لطرح سؤالك"}
                </p>
              </div>
              {/* Back button when confirmed */}
              {trackConfirmed && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackConfirmed(false);
                    setTrackId(0);
                    setQuestion("");
                    setAiStatus("idle");
                    setAiRefined("");
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  dir="rtl"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  تغيير المحور
                </button>
              )}
            </div>
          </div>

          {/* ── STEP 1: Track selection only ── */}
          {!trackConfirmed && (
            <div className="p-6">
              <label
                className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0B1B3D]"
                dir="rtl"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1B3D] text-[10px] font-bold text-[#D4AF37]">١</span>
                اختر المحور الذي تريد طرح سؤالك فيه
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {dynamicTracks.map((t) => {
                  const active = t.id === trackId;
                  const g = getTrackGradient(t.icon);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTrackId(t.id);
                      }}
                      className={[
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                        active
                          ? "border-[#D4AF37] bg-white shadow-md scale-105"
                          : "border-[#E2E5EC] bg-[#F5F6F8] hover:border-[#D4AF37]/40",
                      ].join(" ")}
                      dir="rtl"
                    >
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${g}`}
                      >
                        <TrackIcon icon={t.icon} iconClassName="h-6 w-6 text-white" />
                      </span>
                      <span
                        className={[
                          "text-xs font-bold",
                          active ? "text-[#0B1B3D]" : "text-[#6B7280]",
                        ].join(" ")}
                        dir="rtl"
                      >
                        المحور {t.id}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] text-center leading-tight line-clamp-2" dir="rtl">
                        {t.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Confirm button */}
              {trackId > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="button"
                  onClick={() => setTrackConfirmed(true)}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B1B3D] px-6 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#07152F] sm:text-base"
                  dir="rtl"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-[#0B1B3D]">٢</span>
                  التالي — اكتب سؤالك
                </motion.button>
              )}
            </div>
          )}

          {/* ── STEP 2: Question form (only after track confirmed) ── */}
          {trackConfirmed && trackId > 0 && (
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Paper selector — dynamic from DB */}
              {papersLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
                  <span className="text-xs text-[#6B7280]" dir="rtl">جاري تحميل الأوراق...</span>
                </div>
              ) : papers.some((p) => p.title) ? (
                <div>
                  <label
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#0B1B3D]"
                    dir="rtl"
                  >
                    <FileText className="h-4 w-4 text-[#D4AF37]" />
                    الورقة البحثية
                  </label>
                  <select
                    value={paperSlot}
                    onChange={(e) => setPaperSlot(parseInt(e.target.value, 10))}
                    dir="rtl"
                    className="h-12 w-full appearance-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value={0}>سؤال عام عن المحور</option>
                    {papers.map((p) => (
                      <option key={p.slot} value={p.slot}>
                        {p.slot}. {p.title || `ورقة ${p.slot}`}
                        {p.researcher ? ` — ${p.researcher}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

            {/* Author name */}
            <div>
              <label
                htmlFor="qn-name"
                className="mb-1.5 block text-sm font-bold text-[#0B1B3D]"
                dir="rtl"
              >
                الاسم{" "}
                <span className="text-[#9CA3AF]" dir="rtl">
                  (اختياري)
                </span>
              </label>
              <input
                id="qn-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب اسمك..."
                dir="rtl"
                className="h-12 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* Question text */}
            <div>
              <label
                htmlFor="qn-question"
                className="mb-1.5 block text-sm font-bold text-[#0B1B3D]"
                dir="rtl"
              >
                سؤالك
              </label>
              <textarea
                id="qn-question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setAiStatus("idle");
                  setAiRefined("");
                }}
                rows={5}
                placeholder="اكتب سؤالك هنا بوضوح..."
                dir="rtl"
                className="scroll-elegant w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4 text-sm leading-relaxed text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                required
              />
            </div>

            {/* AI Assistant */}
            <AnimatePresence>
              {question.trim().length >= 5 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-4">
                    {/* AI header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37]">
                          <Sparkles className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#0B1B3D]" dir="rtl">
                            المساعد الذكي
                          </p>
                          <p className="text-[10px] text-[#6B7280]" dir="rtl">
                            يحسّن صياغة سؤالك بناءً على المحور {trackId}
                          </p>
                        </div>
                      </div>
                      {aiStatus === "done" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiStatus("idle");
                            setAiRefined("");
                          }}
                          aria-label="إغلاق"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white hover:text-[#0B1B3D]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>

                    {/* AI action button */}
                    {aiStatus !== "done" && (
                      <button
                        type="button"
                        onClick={handleAiRefine}
                        disabled={aiStatus === "loading"}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-4 text-sm font-bold text-[#D4AF37] shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        dir="rtl"
                      >
                        {aiStatus === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            جاري التحسين...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4" aria-hidden />
                            تحسين صياغة السؤال
                          </>
                        )}
                      </button>
                    )}

                    {/* AI error */}
                    {aiStatus === "error" && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]" dir="rtl">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                        تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى.
                      </p>
                    )}

                    {/* AI result */}
                    {aiStatus === "done" && aiRefined && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="rounded-xl border border-[#D4AF37]/30 bg-white p-3">
                          <p className="text-sm leading-relaxed text-[#0B1B3D]" dir="rtl">
                            {aiRefined}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={useRefined}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B1B3D] px-3 text-xs font-bold text-white transition-colors hover:bg-[#07152F]"
                            dir="rtl"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            استخدام
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiStatus("idle");
                              setAiRefined("");
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#6B7280] transition-colors hover:bg-[#F5F6F8]"
                            dir="rtl"
                          >
                            إلغاء
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status feedback */}
            <AnimatePresence mode="wait">
              {status === "sent" && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-5 w-5 text-green-600" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-green-800" dir="rtl">
                      تم إرسال سؤالك بنجاح
                    </p>
                    <p className="text-xs text-green-700" dir="rtl">
                      وصل سؤالك إلى رئيس جلسة المحور {trackId}. شكرًا لمشاركتك.
                    </p>
                  </div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-[#B91C1C]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#B91C1C]" dir="rtl">
                      تعذر إرسال السؤال
                    </p>
                    <p className="text-xs text-[#B91C1C]/80" dir="rtl">
                      حاول مرة أخرى بعد لحظات
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!question.trim() || status === "sending"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B1B3D] px-6 text-sm font-bold text-white shadow-lg shadow-[#0B1B3D]/20 transition-all hover:bg-[#07152F] disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
              dir="rtl"
            >
              {status === "sending" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-5 w-5" aria-hidden />
              )}
              إرسال السؤال
            </button>
          </form>
          )}

        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/50"
          dir="rtl"
        >
          <ArrowRight className="h-3 w-3" aria-hidden />
          الأسئلة تُرسل مباشرة لرئيس الجلسة المختار
        </motion.p>
      </div>
    </div>
  );
}
