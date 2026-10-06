"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleQuestion,
  X,
  RefreshCw,
  Inbox,
  AlertTriangle,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { useAudienceQuestions } from "@/hooks/use-audience-questions";
import { getTrackById } from "@/lib/tracks";
import { TrackIcon } from "./TrackIcon";
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
  const wk = Math.floor(day / 7);
  return `منذ ${wk} أسبوع`;
}

/** Build a colored initial avatar from the author name. */
function AuthorAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || "؟";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1B3D] to-[#1E3A5F] text-sm font-bold text-[#D4AF37]">
      {initial}
    </span>
  );
}

/** A single, consistently-styled question card. */
function QuestionCard({ q }: { q: AudienceQuestion }) {
  const track = q.trackId ? getTrackById(q.trackId) : null;
  const time = formatRelativeTime(q.createdAt);
  const author = q.author?.trim();

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

      <AuthorAvatar name={author ?? "زائر"} />

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
          {track && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-2 py-0.5 text-[10px] font-bold text-[#0B1B3D]" dir="rtl">
              <TrackIcon icon={track.icon} iconClassName="h-3 w-3 text-[#0B1B3D]" />
              {`المحور ${track.id}`}
            </span>
          )}
        </div>

        {/* Question text — prominent, readable, consistent */}
        <p
          className="text-sm leading-[1.9] text-[#1f2937] sm:text-[15px]"
          dir="rtl"
        >
          {q.question}
        </p>
      </div>
    </motion.article>
  );
}

/**
 * Floating "audience questions" button + slide-up panel.
 *
 * The button is fixed to the bottom-right corner (RTL "end"). Clicking opens a
 * modal-style panel that lists audience questions fetched from the API, each
 * rendered as a consistent, clear card.
 */
export function QuestionsButton() {
  const [open, setOpen] = useState(false);
  const { questions, loading, error, source, reload } = useAudienceQuestions();

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
        {/* Pulse ring */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#D4AF37]/20"
            style={{ animationDuration: "2.5s" }}
          />
        )}
        <MessageCircleQuestion className="h-5 w-5" aria-hidden />
        <span className="text-sm font-bold" dir="rtl">
          أسئلة الجمهور
        </span>
        {count > 0 && !open && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#D4AF37] px-1.5 text-xs font-extrabold text-[#0B1B3D]">
            {count}
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
                      <h3 className="text-base font-bold sm:text-lg" dir="rtl">
                        أسئلة الجمهور
                      </h3>
                      <p className="text-xs text-white/70" dir="rtl">
                        {count > 0 ? `${count} سؤال` : "لا أسئلة بعد"}
                        {source === "sample" && " · بيانات تجريبية"}
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
                {/* Drag handle (mobile) */}
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/30 sm:hidden"
                />
              </div>

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

                  {/* ERROR */}
                  {!loading && error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                        <AlertTriangle className="h-7 w-7 text-[#B91C1C]" />
                      </span>
                      <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={reload}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#07152F]"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        إعادة المحاولة
                      </button>
                    </motion.div>
                  )}

                  {/* EMPTY */}
                  {!loading && !error && questions.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4ECD0]">
                        <Inbox className="h-7 w-7 text-[#D4AF37]" />
                      </span>
                      <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
                        لا توجد أسئلة حاليًا
                      </p>
                      <p className="text-xs text-[#6B7280]" dir="rtl">
                        ستظهر أسئلة الجمهور هنا فور طرحها.
                      </p>
                    </motion.div>
                  )}

                  {/* LIST */}
                  {!loading && !error && questions.length > 0 && (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-3"
                    >
                      <AnimatePresence mode="popLayout">
                        {questions.map((q) => (
                          <QuestionCard key={q.id} q={q} />
                        ))}
                      </AnimatePresence>

                      {/* Footer note */}
                      <p
                        className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#9CA3AF]"
                        dir="rtl"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                        {source === "external"
                          ? "تُجلب الأسئلة من النظام الخارجي مباشرةً"
                          : "أسئلة تجريبية — يتم عرض الأسئلة الحقيقية عند ربط مصدر البيانات"}
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
