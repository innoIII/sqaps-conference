"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { TrackInfo, ApiErrorResponse, ContentFile } from "@/types";
import { getTrackById } from "@/lib/tracks";
import { TrackIcon, getTrackGradient } from "./TrackIcon";
import { SessionHeader } from "./SessionHeader";
import { ResearchPapersTable } from "./ResearchPapersTable";
import { SessionReportEditor } from "./SessionReportEditor";
import { useTrackSession } from "@/hooks/use-track-session";
import { useSiteContentValue } from "./SiteContentProvider";

interface ContentCardProps {
  track: TrackInfo | null;
  loading: boolean;
  error: ApiErrorResponse | null;
  onRetry: () => void;
  onPreview: (file: ContentFile) => void;
}

/**
 * The main content panel for the currently selected track.
 *
 * Layout (per the user's spec):
 *   ┌─ Track header strip (themed icon + title + subtitle) ─┐
 *   ├─ Session header (4 cells: time / venue / chair / sec) ┤
 *   ├─ Research-papers table (4 rows × 5 cols, PDF dl/pv)  ┤
 *   └─ (audience questions handled by the floating button)  ┘
 *
 * The chair's private report is NOT shown here (admin-only).
 */
export function ContentCard({
  track,
  loading,
  error,
  onRetry,
  onPreview,
}: ContentCardProps) {
  // Fetch session data (header + papers) for the current track.
  const trackId = track?.id ?? 1;
  const {
    session,
    papers,
    loading: sessionLoading,
    error: sessionError,
    reload: sessionReload,
  } = useTrackSession(trackId);

  const trackConfig = track ? getTrackById(track.id) : null;
  const gradient = trackConfig ? getTrackGradient(trackConfig.icon) : "";
  const { get } = useSiteContentValue();
  const trackTitle = track ? get(`track.${track.id}.title`, track.title) : "—";
  const trackSubtitle = track ? get(`track.${track.id}.subtitle`, track.subtitle) : "";

  /** Wrapper to adapt the preview callback to PDF URLs. */
  const handlePreviewUrl = (url: string, name: string) => {
    onPreview({
      name,
      url,
      type: "pdf",
      extension: ".pdf",
      size: 0,
    });
  };

  return (
    <section
      aria-labelledby="content-heading"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-lg shadow-[#0B1B3D]/5">
        {/* Track header strip (no "0 files" / "#" badge) */}
        <div className="relative flex items-center justify-between gap-4 border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white sm:px-7 sm:py-5">
          {/* Subtle themed glow */}
          {trackConfig && (
            <span
              aria-hidden
              className={`pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`}
            />
          )}
          <div className="relative flex items-center gap-3">
            {/* Themed gradient icon badge */}
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${gradient}`}
            >
              {trackConfig ? (
                <TrackIcon icon={trackConfig.icon} iconClassName="h-6 w-6 text-white" />
              ) : (
                <span className="text-base font-bold text-white">—</span>
              )}
              <span className="absolute -bottom-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0B1B3D] bg-[#D4AF37] px-1 text-[10px] font-bold text-[#0B1B3D] shadow-sm">
                {track ? String(track.id).padStart(2, "0") : "—"}
              </span>
            </span>
            <div className="min-w-0">
              <h3
                id="content-heading"
                className="truncate text-base font-bold sm:text-lg"
                dir="rtl"
              >
                {trackTitle}
              </h3>
              <p className="truncate text-xs text-white/70 sm:text-sm" dir="rtl">
                {trackSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5 sm:p-7">
          <AnimatePresence mode="wait">
            {/* LOADING (track files) */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-16 text-center"
              >
                <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
                <p className="text-sm font-medium text-[#6B7280]">
                  جاري تحميل المحتوى...
                </p>
              </motion.div>
            )}

            {/* ERROR (track files) */}
            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-16 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-7 w-7 text-[#B91C1C]" />
                </span>
                <p className="text-base font-semibold text-[#0B1B3D]">
                  تعذر تحميل محتوى هذا المحور
                </p>
                <p className="max-w-sm text-sm text-[#6B7280]">{error.error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#07152F]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  إعادة المحاولة
                </button>
              </motion.div>
            )}

            {/* CONTENT */}
            {!loading && !error && track && (
              <motion.div
                key={`session-${track.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {/* Session header: 4 info cells */}
                <SessionHeader
                  session={session}
                  loading={sessionLoading}
                />

                {/* Session error retry (subtle) */}
                {sessionError && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
                    <span dir="rtl">{sessionError}</span>
                    <button
                      type="button"
                      onClick={sessionReload}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#E2E5EC] bg-white px-2 text-[11px] font-semibold text-[#0B1B3D] hover:border-[#D4AF37]/50"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden />
                      إعادة
                    </button>
                  </div>
                )}

                {/* Research-papers table (4 rows × 5 cols) */}
                <ResearchPapersTable
                  papers={papers}
                  loading={sessionLoading}
                  onPreview={handlePreviewUrl}
                />

                {/* Chair's session report editor (saves to DB) */}
                <SessionReportEditor
                  trackId={track.id}
                  trackTitle={trackTitle}
                  chairName={session?.chair}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
