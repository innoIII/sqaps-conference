"use client";

import { motion } from "framer-motion";
import { FileText, Eye, Download, User, FileBadge, Inbox } from "lucide-react";
import type { ResearchPaper } from "@/types";

interface ResearchPapersTableProps {
  papers: ResearchPaper[];
  loading: boolean;
  onPreview: (url: string, name: string) => void;
}

/** Convert a number to Arabic-Indic digits. */
function toArabic(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/** A PDF cell — shows download + preview buttons, or an empty state. */
function PdfCell({
  url,
  label,
  onPreview,
}: {
  url?: string;
  label: string;
  onPreview: (url: string, name: string) => void;
}) {
  if (!url) {
    return (
      <div className="flex items-center justify-center gap-1 py-3 text-[11px] text-[#9CA3AF]" dir="rtl">
        <Inbox className="h-3.5 w-3.5" aria-hidden />
        <span>غير متاح</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      <button
        type="button"
        onClick={() => onPreview(url, label)}
        aria-label={`معاينة ${label}`}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B1B3D] px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-[#07152F]"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
        معاينة
      </button>
      <a
        href={url}
        download
        aria-label={`تحميل ${label}`}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#F4ECD0] px-2.5 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37]"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        تحميل
      </a>
    </div>
  );
}

/**
 * Horizontal research-papers table: dynamic columns (one per paper) × 4 rows
 * (title / researcher / paper PDF / CV PDF).
 *
 * Papers are dynamic — the admin can add/remove them. The table renders
 * whatever papers exist in the DB.
 *
 * On small screens the table scrolls horizontally.
 */
export function ResearchPapersTable({
  papers,
  loading,
  onPreview,
}: ResearchPapersTableProps) {
  // Use papers directly (dynamic count). Filter out empty papers (no title + no researcher).
  const slots = papers.filter((p) => p.title || p.researcher || p.paperUrl || p.cvUrl);
  const count = slots.length;

  // If no papers at all, show empty state.
  if (!loading && count === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white"
      >
        <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2.5">
          <FileBadge className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
            الأوراق البحثية
          </h4>
        </div>
        <div className="flex items-center justify-center gap-2 py-10 text-[#9CA3AF]">
          <Inbox className="h-5 w-5" aria-hidden />
          <span className="text-sm" dir="rtl">
            لا توجد أوراق بحثية مسجلة لهذا المحور
          </span>
        </div>
      </motion.div>
    );
  }

  // Min width based on count (at least 640px for readability).
  const minWidth = Math.max(640, count * 160);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white"
    >
      {/* Section title */}
      <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2.5">
        <FileBadge className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
          الأوراق البحثية
        </h4>
        <span className="ms-auto text-[11px] text-[#9CA3AF]" dir="rtl">
          {toArabic(count)} {count === 1 ? "ورقة" : "أوراق"}
        </span>
      </div>

      {/* Horizontal-scroll wrapper (iPad / mobile friendly) */}
      <div className="scroll-elegant overflow-x-auto">
        <table className="w-full border-collapse text-center" style={{ minWidth: `${minWidth}px` }} dir="rtl">
          <tbody>
            {/* Row 1: Title */}
            <tr className="border-b border-[#E2E5EC]">
              <th
                scope="row"
                className="sticky right-0 z-10 w-28 border-l border-[#E2E5EC] bg-[#0B1B3D] px-3 py-3 text-xs font-bold text-[#D4AF37]"
                dir="rtl"
              >
                عنوان الورقة
              </th>
              {slots.map((p, i) => (
                <td key={i} className="min-w-[140px] px-2 py-3 align-middle">
                  {loading ? (
                    <div className="mx-auto h-4 w-24 animate-pulse rounded bg-[#E2E5EC]" />
                  ) : p.title ? (
                    <p
                      className="text-xs font-semibold leading-snug text-[#0B1B3D]"
                      dir="rtl"
                    >
                      {p.title}
                    </p>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF]">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row 2: Researcher */}
            <tr className="border-b border-[#E2E5EC] bg-[#FAFBFC]">
              <th
                scope="row"
                className="sticky right-0 z-10 w-28 border-l border-[#E2E5EC] bg-[#0B1B3D] px-3 py-3 text-xs font-bold text-[#D4AF37]"
                dir="rtl"
              >
                <span className="flex items-center justify-center gap-1">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  الباحث
                </span>
              </th>
              {slots.map((p, i) => (
                <td key={i} className="min-w-[140px] px-2 py-3 align-middle">
                  {loading ? (
                    <div className="mx-auto h-4 w-20 animate-pulse rounded bg-[#E2E5EC]" />
                  ) : p.researcher ? (
                    <p
                      className="text-xs font-medium text-[#0B1B3D]"
                      dir="rtl"
                    >
                      {p.researcher}
                    </p>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF]">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row 3: Paper PDF */}
            <tr className="border-b border-[#E2E5EC]">
              <th
                scope="row"
                className="sticky right-0 z-10 w-28 border-l border-[#E2E5EC] bg-[#0B1B3D] px-3 py-3 text-xs font-bold text-[#D4AF37]"
                dir="rtl"
              >
                <span className="flex items-center justify-center gap-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  الورقة البحثية
                </span>
              </th>
              {slots.map((p, i) => (
                <td key={i} className="min-w-[140px] px-2 align-middle">
                  {loading ? (
                    <div className="mx-auto h-6 w-20 animate-pulse rounded bg-[#E2E5EC]" />
                  ) : (
                    <PdfCell
                      url={p.paperUrl}
                      label={`ورقة ${p.slot} - ${p.researcher ?? ""}`}
                      onPreview={onPreview}
                    />
                  )}
                </td>
              ))}
            </tr>

            {/* Row 4: CV PDF */}
            <tr>
              <th
                scope="row"
                className="sticky right-0 z-10 w-28 border-l border-[#E2E5EC] bg-[#0B1B3D] px-3 py-3 text-xs font-bold text-[#D4AF37]"
                dir="rtl"
              >
                <span className="flex items-center justify-center gap-1">
                  <FileBadge className="h-3.5 w-3.5" aria-hidden />
                  السيرة الذاتية
                </span>
              </th>
              {slots.map((p, i) => (
                <td key={i} className="min-w-[140px] px-2 align-middle">
                  {loading ? (
                    <div className="mx-auto h-6 w-20 animate-pulse rounded bg-[#E2E5EC]" />
                  ) : (
                    <PdfCell
                      url={p.cvUrl}
                      label={`سيرة ذاتية ${p.slot} - ${p.researcher ?? ""}`}
                      onPreview={onPreview}
                    />
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
