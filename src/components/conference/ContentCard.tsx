"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Loader2,
  Inbox,
  AlertTriangle,
  RefreshCw,
  Hash,
  FilterX,
} from "lucide-react";
import type { ContentFile, TrackInfo, ApiErrorResponse } from "@/types";
import { FileList } from "./FileList";
import { FileToolbar } from "./FileToolbar";
import { useFileFilters } from "@/hooks/use-file-filters";

interface ContentCardProps {
  track: TrackInfo | null;
  files: ContentFile[];
  loading: boolean;
  error: ApiErrorResponse | null;
  onRetry: () => void;
  onPreview: (file: ContentFile) => void;
}

/**
 * The main content panel for the currently selected track.
 * Renders four mutually-exclusive states: loading, error, empty, files.
 * When files are present, shows a filter/sort toolbar above the grid.
 */
export function ContentCard({
  track,
  files,
  loading,
  error,
  onRetry,
  onPreview,
}: ContentCardProps) {
  const filters = useFileFilters(files);

  return (
    <section
      aria-labelledby="content-heading"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-lg shadow-[#0B1B3D]/5">
        {/* Track header strip */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37] text-base font-bold text-[#0B1B3D] shadow-md shadow-[#D4AF37]/20">
              {track ? String(track.id).padStart(2, "0") : "—"}
            </span>
            <div className="min-w-0">
              <h3
                id="content-heading"
                className="truncate text-base font-bold sm:text-lg"
                dir="rtl"
              >
                {track?.title ?? "—"}
              </h3>
              <p className="truncate text-xs text-white/70 sm:text-sm" dir="rtl">
                {track?.subtitle ?? ""}
              </p>
            </div>
          </div>

          {!loading && !error && track && (
            <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 sm:inline-flex">
              <Hash className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              {files.length} ملف
            </div>
          )}
        </div>

        {/* Body — animated state switching */}
        <div className="p-5 sm:p-7">
          <AnimatePresence mode="wait">
            {/* LOADING */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-16 text-center"
              >
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
                  <FolderOpen className="absolute inset-0 m-auto h-4 w-4 text-[#0B1B3D]" />
                </div>
                <p className="text-sm font-medium text-[#6B7280]">
                  جاري تحميل المحتوى...
                </p>
                <div className="mt-2 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-2xl bg-[#F5F6F8]"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ERROR */}
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

            {/* EMPTY (no files at all) */}
            {!loading && !error && files.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-16 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4ECD0]">
                  <Inbox className="h-7 w-7 text-[#D4AF37]" />
                </span>
                <p className="text-base font-semibold text-[#0B1B3D]">
                  لا توجد ملفات متاحة لهذا المحور حاليًا
                </p>
                <p className="max-w-sm text-sm text-[#6B7280]">
                  ستظهر الملفات تلقائيًا فور إضافتها من قبل منظمي المؤتمر.
                </p>
              </motion.div>
            )}

            {/* FILES (with toolbar) */}
            {!loading && !error && files.length > 0 && (
              <motion.div
                key={`files-${track?.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FileToolbar
                  filter={filters.filter}
                  onFilterChange={filters.setFilter}
                  sort={filters.sort}
                  onSortChange={filters.setSort}
                  availableTypes={filters.availableTypes}
                  totalCount={files.length}
                  resultCount={filters.resultCount}
                />

                {filters.resultCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F6F8]">
                      <FilterX className="h-6 w-6 text-[#6B7280]" />
                    </span>
                    <p className="text-sm font-semibold text-[#0B1B3D]">
                      لا توجد ملفات مطابقة لهذا التصنيف
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      جرّب اختيار تصنيف آخر أو إعادة الضبط.
                    </p>
                    <button
                      type="button"
                      onClick={filters.reset}
                      className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-4 text-xs font-semibold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      إعادة ضبط الفلترة
                    </button>
                  </div>
                ) : (
                  <FileList files={filters.filtered} onPreview={onPreview} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
