"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleQuestion,
  X,
  RefreshCw,
  Inbox,
  Clock,
  User,
  Radio,
  CheckCircle2,
  CircleDot,
  Send,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
} from "lucide-react";
import { useTrackQuestions } from "@/hooks/use-track-questions";
import { getTrackById, tracks } from "@/lib/tracks";
import { TrackIcon } from "./TrackIcon";
import { useSiteContentValue } from "./SiteContentProvider";
import type { AudienceQuestion } from "@/types";

/** Format an ISO date into a short Arabic relative-time string. */
function formatRelativeTime(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return "الآن";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `منذ ${day} يوم`;
  return `منذ ${Math.floor(day / 7)} أسبوع`;
}

/** A single, consistently-styled question card. */
function QuestionCard({
  q,
  onDelete,
}: {
  q: AudienceQuestion;
  onDelete?: (id: string) => void;
}) {
  const time = formatRelativeTime(q.createdAt);
  const author = q.author?.trim();
  const track = q.trackId ? getTrackById(q.trackId) : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="group relative flex gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 transition-all hover:border-[#D4AF37]/40 hover:shadow-md"
    >
      {/* Right accent (RTL) */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-1 rounded-r-2xl bg-gradient-to-b from-[#D4AF37] to-[#E6C869] opacity-0 transition-opacity group-hover:opacity-100"
      />

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1B3D] to-[#1E3A5F] text-sm font-bold text-[#D4AF37]">
        {author?.charAt(0) ?? "؟"}
      </span>

      <div className="min-w-0 flex-1">
        {/* Meta row */}
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B1B3D]"
            dir="rtl"
          >
            <User className="h-3 w-3 text-[#9CA3AF]" aria-hidden />
            {author ?? "زائر"}
          </span>
          {time && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]" dir="rtl">
              <Clock className="h-3 w-3" aria-hidden />
              {time}
            </span>
          )}
          {/* Status badge */}
          {q.status === "ANSWERED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700" dir="rtl">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              تمت الإجابة
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-2 py-0.5 text-[10px] font-bold text-[#0B1B3D]" dir="rtl">
              <CircleDot className="h-3 w-3 text-[#D4AF37]" aria-hidden />
              جديد
            </span>
          )}
          {track && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0B1B3D]/5 px-2 py-0.5 text-[10px] font-bold text-[#0B1B3D]" dir="rtl">
              <TrackIcon icon={track.icon} iconClassName="h-3 w-3 text-[#0B1B3D]" />
              {`المحور ${track.id}`}
            </span>
          )}
        </div>

        {/* Question text */}
        <p className="text-sm leading-[1.9] text-[#1f2937] sm:text-[15px]" dir="rtl">
          {q.question}
        </p>
      </div>

      {/* Delete button (shown when onDelete is provided) */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(q.id)}
          aria-label="حذف السؤال"
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] opacity-0 transition-all hover:bg-red-50 hover:text-[#B91C1C] group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </motion.article>
  );
}

/** Question submission form — user selects a track + writes + sends. */
function QuestionForm({
  defaultTrackId,
  onSubmit,
}: {
  defaultTrackId: number;
  onSubmit: (trackId: number, question: string, author?: string) => Promise<boolean>;
}) {
  const { get } = useSiteContentValue();
  const [trackId, setTrackId] = useState(defaultTrackId);
  const [question, setQuestion] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  // Sync the track selector when the user switches tracks on the main page.
  useEffect(() => {
    setTrackId(defaultTrackId);
  }, [defaultTrackId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!question.trim() || status === "sending") return;
      setStatus("sending");
      const ok = await onSubmit(trackId, question.trim(), author.trim() || undefined);
      if (ok) {
        setStatus("sent");
        setQuestion("");
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    },
    [question, author, trackId, status, onSubmit],
  );

  const selectedTrack = getTrackById(trackId);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-[#E2E5EC] bg-white p-4"
    >
      {/* Track selector */}
      <label
        className="mb-1.5 flex items-center gap-1 text-xs font-bold text-[#0B1B3D]"
        dir="rtl"
      >
        <TrackIcon
          icon={selectedTrack?.icon ?? "law"}
          iconClassName="h-3.5 w-3.5 text-[#D4AF37]"
        />
        اختر المحور
      </label>
      <div className="mb-3 grid grid-cols-5 gap-1.5">
        {tracks.map((t) => {
          const active = t.id === trackId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrackId(t.id)}
              className={[
                "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                active
                  ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-sm"
                  : "border-[#E2E5EC] bg-white text-[#6B7280] hover:border-[#D4AF37]/40",
              ].join(" ")}
              dir="rtl"
            >
              <TrackIcon
                icon={t.icon}
                iconClassName={`h-4 w-4 ${active ? "text-[#D4AF37]" : "text-[#9CA3AF]"}`}
              />
              <span className="text-[10px] font-bold">{t.id}</span>
            </button>
          );
        })}
      </div>

      {/* Author (optional) */}
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="الاسم (اختياري)"
        dir="rtl"
        className="mb-2 h-10 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
      />

      {/* Question text */}
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="اكتب سؤالك هنا..."
        dir="rtl"
        className="scroll-elegant mb-2 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
      />

      {/* Submit + status */}
      <div className="flex items-center justify-between gap-2">
        {status === "sent" ? (
          <p className="inline-flex items-center gap-1 text-xs font-bold text-green-600" dir="rtl">
            <Check className="h-3.5 w-3.5" aria-hidden />
            تم إرسال السؤال
          </p>
        ) : status === "error" ? (
          <p className="inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C]" dir="rtl">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            تعذر الإرسال
          </p>
        ) : (
          <p className="text-[11px] text-[#9CA3AF]" dir="rtl">
            سيظهر سؤالك لرئيس جلسة المحور {trackId} فقط
          </p>
        )}
        <button
          type="submit"
          disabled={!question.trim() || status === "sending"}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0B1B3D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#07152F] disabled:cursor-not-allowed disabled:opacity-40"
          dir="rtl"
        >
          {status === "sending" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          إرسال
        </button>
      </div>
    </form>
  );
}

interface QuestionsButtonProps {
  /** The currently selected track id — only that track's questions show. */
  trackId: number;
}

/**
 * Floating "audience questions" button + slide-up panel.
 *
 * Shows questions for the currently selected track ONLY. A question submitted
 * for Track 2 won't appear if the viewer has Track 1 open.
 *
 * Includes a submission form where the audience member selects a track and
 * writes their question — it's saved to the DB and delivered in real-time to
 * whoever has that track's page open.
 */
export function QuestionsButton({ trackId }: QuestionsButtonProps) {
  const [open, setOpen] = useState(false);
  const { questions, loading, live, newCount, submit, deleteQuestion, clearAll, reload } =
    useTrackQuestions(open, trackId);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, handleKey]);

  const count = useMemo(() => questions.length, [questions]);
  const currentTrack = getTrackById(trackId);

  return (
    <>
      {/* Floating button */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "إغلاق أسئلة الجمهور" : "عرض أسئلة الجمهور"}
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 24 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-[#0B1B3D] to-[#07152F] px-5 text-[#D4AF37] shadow-xl shadow-[#0B1B3D]/30 ring-2 ring-[#D4AF37]/30 transition-colors hover:from-[#07152F] hover:to-[#0B1B3D] sm:bottom-8 sm:right-8"
      >
        {/* Animated ripple effect (3 expanding rings) */}
        {!open && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-[#D4AF37]/30"
              style={{ animation: "ripple 2s ease-out infinite" }}
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-[#D4AF37]/20"
              style={{ animation: "ripple 2s ease-out infinite 0.5s" }}
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-[#D4AF37]/10"
              style={{ animation: "ripple 2s ease-out infinite 1s" }}
            />
          </>
        )}
        {/* Pulsing icon */}
        <motion.span
          animate={!open ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 2, repeat: !open ? Infinity : 0, ease: "easeInOut" }}
        >
          <MessageCircleQuestion className="h-5 w-5" aria-hidden />
        </motion.span>
        <span className="text-sm font-bold" dir="rtl">
          أسئلة الجمهور
        </span>
        {count > 0 && !open && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#D4AF37] px-1.5 text-xs font-extrabold text-[#0B1B3D]">
            {count}
          </span>
        )}
        {newCount > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            +{newCount}
          </span>
        )}
      </motion.button>

      {/* Slide-up panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="أسئلة الجمهور"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-[#07152F]/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[80vh] sm:rounded-3xl"
            >
              {/* Header */}
              <div className="relative shrink-0 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D] shadow-md">
                      <MessageCircleQuestion className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg" dir="rtl">
                        أسئلة الجمهور
                        {live ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-300"
                            title="البث المباشر متصل"
                            dir="rtl"
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                            </span>
                            مباشر
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60"
                            title="البث غير متصل"
                            dir="rtl"
                          >
                            <Radio className="h-3 w-3" aria-hidden />
                            غير متصل
                          </span>
                        )}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-white/70" dir="rtl">
                        {currentTrack && (
                          <>
                            <TrackIcon
                              icon={currentTrack.icon}
                              iconClassName="h-3 w-3 text-[#D4AF37]"
                            />
                            {`المحور ${trackId} · `}
                          </>
                        )}
                        {count > 0 ? `${count} سؤال` : "لا أسئلة بعد"}
                        {newCount > 0 && ` · ${newCount} جديد`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={reload}
                      disabled={loading}
                      aria-label="تحديث الأسئلة"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="إغلاق"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-[#B91C1C] hover:border-[#B91C1C]"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/30 sm:hidden"
                />
              </div>

              {/* No submission form here — chairs only VIEW questions.
                  The audience submits questions via the /qn page. */}

              {/* Body — scrollable list */}
              <div className="scroll-elegant min-h-0 flex-1 overflow-y-auto bg-[#F5F6F8] p-4 sm:p-5">
                <AnimatePresence mode="wait">
                  {/* LOADING */}
                  {loading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                    >
                      <RefreshCw className="h-8 w-8 animate-spin text-[#D4AF37]" />
                      <p className="text-sm text-[#6B7280]" dir="rtl">
                        جاري تحميل الأسئلة...
                      </p>
                    </motion.div>
                  )}

                  {/* EMPTY */}
                  {!loading && questions.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4ECD0]">
                        <Inbox className="h-7 w-7 text-[#D4AF37]" />
                      </span>
                      <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
                        لا توجد أسئلة للمحور {trackId} حاليًا
                      </p>
                      <p className="text-xs text-[#6B7280]" dir="rtl">
                        ستظهر أسئلة الجمهور هنا فور طرحها عبر صفحة الإرسال
                      </p>
                    </motion.div>
                  )}

                  {/* LIST */}
                  {!loading && questions.length > 0 && (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-3"
                    >
                      {/* Clear-all bar */}
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("هل تريد حذف جميع أسئلة هذا المحور؟")) {
                              clearAll();
                            }
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-[#B91C1C] transition-colors hover:bg-red-100"
                          dir="rtl"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                          مسح الكل ({count})
                        </button>
                      </div>

                      <AnimatePresence mode="popLayout">
                        {questions.map((q) => (
                          <QuestionCard
                            key={q.id}
                            q={q}
                            onDelete={deleteQuestion}
                          />
                        ))}
                      </AnimatePresence>

                      <p
                        className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#9CA3AF]"
                        dir="rtl"
                      >
                        <Radio
                          className={`h-3 w-3 ${live ? "text-green-500" : "text-[#9CA3AF]"}`}
                          aria-hidden
                        />
                        {live
                          ? "البث المباشر متصل — تصل الأسئلة الجديدة فورًا"
                          : "أسئلة المحور محفوظة في قاعدة البيانات"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
