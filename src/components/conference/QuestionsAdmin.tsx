"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trash2,
  Loader2,
  RefreshCw,
  Inbox,
  MessageCircleQuestion,
  AlertTriangle,
} from "lucide-react";
import { tracks, getTrackById } from "@/lib/tracks";
import { TrackIcon, getTrackGradient } from "./TrackIcon";
import type { AudienceQuestion } from "@/types";

/**
 * Admin tab — "إدارة الأسئلة".
 *
 * Shows ALL questions across ALL tracks, grouped by track. The admin can:
 *   - View every question
 *   - Delete a single question
 *   - Clear all questions for a track
 *   - Clear ALL questions (every track)
 *
 * Questions are fetched from GET /api/questions?trackId=N for each track.
 */
export function QuestionsAdmin() {
  const [byTrack, setByTrack] = useState<Record<number, AudienceQuestion[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<number>(0); // 0 = all tracks

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all(
      tracks.map((t) =>
        fetch(`/api/questions?trackId=${t.id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => [t.id, d.questions ?? []] as [number, AudienceQuestion[]])
          .catch(() => [t.id, []] as [number, AudienceQuestion[]]),
      ),
    )
      .then((entries) => {
        setByTrack(Object.fromEntries(entries) as Record<number, AudienceQuestion[]>);
      })
      .finally(() => setLoading(false));
  }, []);

  // Initial load — run once on mount.
  const [initLoaded, setInitLoaded] = useState(false);
  useEffect(() => {
    if (initLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitLoaded(true);
    loadAll();
  }, [initLoaded, loadAll]);

  const totalCount = Object.values(byTrack).reduce(
    (sum, qs) => sum + qs.length,
    0,
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/questions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      loadAll();
    },
    [loadAll],
  );

  const handleClearTrack = useCallback(
    async (trackId: number) => {
      if (!confirm(`حذف جميع أسئلة المحور ${trackId}؟`)) return;
      await fetch(`/api/questions?trackId=${trackId}`, { method: "DELETE" });
      loadAll();
    },
    [loadAll],
  );

  const handleClearAll = useCallback(async () => {
    if (!confirm("حذف جميع الأسئلة من كل المحاور؟")) return;
    await fetch("/api/questions?all=true", { method: "DELETE" });
    loadAll();
  }, [loadAll]);

  // Determine which tracks to show.
  const visibleTracks =
    activeTrack === 0 ? tracks : tracks.filter((t) => t.id === activeTrack);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37]">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
              إدارة الأسئلة
            </h3>
            <p className="text-xs text-[#6B7280]" dir="rtl">
              {totalCount > 0 ? `${totalCount} سؤال` : "لا أسئلة"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50 disabled:opacity-50"
            dir="rtl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            تحديث
          </button>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-red-100"
              dir="rtl"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              حذف الكل
            </button>
          )}
        </div>
      </div>

      {/* Track filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTrack(0)}
          className={[
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all",
            activeTrack === 0
              ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
              : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
          ].join(" ")}
          dir="rtl"
        >
          الكل ({totalCount})
        </button>
        {tracks.map((t) => {
          const count = byTrack[t.id]?.length ?? 0;
          const active = activeTrack === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTrack(t.id)}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all",
                active
                  ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
                  : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
              ].join(" ")}
              dir="rtl"
            >
              <TrackIcon
                icon={t.icon}
                iconClassName={`h-3.5 w-3.5 ${active ? "text-[#D4AF37]" : "text-[#9CA3AF]"}`}
              />
              المحور {t.id} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
          <span className="text-sm" dir="rtl">
            جاري التحميل...
          </span>
        </div>
      )}

      {/* Questions grouped by track */}
      {!loading &&
        visibleTracks.map((t) => {
          const qs = byTrack[t.id] ?? [];
          const gradient = getTrackGradient(t.icon);
          if (qs.length === 0 && activeTrack !== 0) return null;
          return (
            <section
              key={t.id}
              className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
            >
              {/* Track header */}
              <div className={`flex items-center justify-between gap-3 bg-gradient-to-l ${gradient} px-5 py-3 text-white`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <TrackIcon icon={t.icon} iconClassName="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold" dir="rtl">
                      المحور {t.id}
                    </h4>
                    <p className="text-[10px] text-white/80" dir="rtl">
                      {qs.length} سؤال
                    </p>
                  </div>
                </div>
                {qs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleClearTrack(t.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-red-500/80"
                    dir="rtl"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    مسح المحور
                  </button>
                )}
              </div>

              {/* Questions list */}
              {qs.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[#9CA3AF]">
                  <Inbox className="h-5 w-5" aria-hidden />
                  <span className="text-sm" dir="rtl">
                    لا أسئلة
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-[#E2E5EC]">
                  {qs.map((q) => (
                    <li
                      key={q.id}
                      className="group flex items-start gap-3 p-4 transition-colors hover:bg-[#F5F6F8]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-[#0B1B3D]" dir="rtl">
                          {q.question}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#9CA3AF]">
                          {q.author && (
                            <span dir="rtl">— {q.author}</span>
                          )}
                          {q.createdAt && (
                            <span dir="rtl">
                              {new Date(q.createdAt).toLocaleString("ar")}
                            </span>
                          )}
                          {q.status === "ANSWERED" && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700" dir="rtl">
                              تمت الإجابة
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        aria-label="حذف"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

      {/* Empty state */}
      {!loading && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E2E5EC] bg-white py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4ECD0]">
            <Inbox className="h-8 w-8 text-[#D4AF37]" />
          </span>
          <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
            لا توجد أسئلة حاليًا
          </p>
          <p className="text-xs text-[#6B7280]" dir="rtl">
            ستظهر الأسئلة هنا فور طرحها من الجمهور
          </p>
        </div>
      )}
    </motion.div>
  );
}
