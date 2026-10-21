"use client";

import { motion } from "framer-motion";
import { FileText, Eye, Download, User, FileBadge, Inbox, Users } from "lucide-react";
import type { ResearchPaper } from "@/types";
import { PhoneLink } from "./PhoneLink";

interface ResearchPapersTableProps {
  papers: ResearchPaper[];
  loading: boolean;
  onPreview: (url: string, name: string) => void;
}

/** Convert a number to Arabic-Indic digits. */
function toArabic(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/** Parse the researcher field into an array of names (one per line). */
function parseResearchers(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** The phone for researcher #i (phones are stored one per line, same order). */
function phoneAt(raw: string | undefined, i: number): string | undefined {
  return raw?.split("\n")[i]?.trim() || undefined;
}

/** Format researchers for display: "د. العامري، أ. الكندي" or numbered list. */
function formatResearchers(raw?: string): string {
  const list = parseResearchers(raw);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  // Multiple: join with "، " (Arabic comma).
  return list.join("، ");
}

/** A PDF cell — shows download + preview buttons, or an empty state. */
function PdfCell({
  url,
  label,
  onPreview,
  compact,
}: {
  url?: string;
  label: string;
  onPreview: (url: string, name: string) => void;
  compact?: boolean;
}) {
  if (!url) {
    return (
      <div className="flex items-center justify-center gap-1 py-2 text-[11px] text-[#9CA3AF]" dir="rtl">
        <Inbox className="h-3 w-3" aria-hidden />
        <span>غير متاح</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      <button
        type="button"
        onClick={() => onPreview(url, label)}
        aria-label={`معاينة ${label}`}
        className={`inline-flex items-center gap-1 rounded-lg bg-[#0B1B3D] px-2 text-[11px] font-bold text-white transition-colors hover:bg-[#07152F] ${compact ? "h-7" : "h-8"}`}
      >
        <Eye className="h-3 w-3" aria-hidden />
        معاينة
      </button>
      <a
        href={url}
        download
        aria-label={`تحميل ${label}`}
        className={`inline-flex items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#F4ECD0] px-2 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37] ${compact ? "h-7" : "h-8"}`}
      >
        <Download className="h-3 w-3" aria-hidden />
        تحميل
      </a>
    </div>
  );
}

/**
 * Research-papers display — responsive:
 *   - Mobile (<768px): card layout (one card per paper)
 *   - iPad/Desktop (≥768px): horizontal table with sticky header column
 *
 * Supports multiple researchers (one name per line in the DB field).
 * Titles auto-wrap with proper Arabic text balancing.
 */
export function ResearchPapersTable({
  papers,
  loading,
  onPreview,
}: ResearchPapersTableProps) {
  const slots = papers.filter((p) => p.title || p.researcher || p.paperUrl || p.cvUrl);
  const count = slots.length;

  // ── Loading state ──
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white"
      >
        <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2.5">
          <FileBadge className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">الأوراق البحثية</h4>
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F5F6F8]" />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Empty state ──
  if (count === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white"
      >
        <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2.5">
          <FileBadge className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">الأوراق البحثية</h4>
        </div>
        <div className="flex items-center justify-center gap-2 py-10 text-[#9CA3AF]">
          <Inbox className="h-5 w-5" aria-hidden />
          <span className="text-sm" dir="rtl">لا توجد أوراق بحثية مسجلة لهذا المحور</span>
        </div>
      </motion.div>
    );
  }

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
        <h4 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">الأوراق البحثية</h4>
        <span className="ms-auto text-[11px] text-[#9CA3AF]" dir="rtl">
          {toArabic(count)} {count === 1 ? "ورقة" : "أوراق"}
        </span>
      </div>

      {/* ── Mobile: Card layout (< 768px) ── */}
      <div className="space-y-3 p-3 md:hidden">
        {slots.map((p, i) => {
          const researchers = parseResearchers(p.researcher);
          return (
            <div key={i} className="rounded-xl border border-[#E2E5EC] bg-[#FAFBFC] p-3">
              {/* Slot number */}
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B1B3D] text-[10px] font-bold text-[#D4AF37]">
                  {p.slot}
                </span>
                {p.title && (
                  <h5
                    className="flex-1 text-xs font-bold leading-snug text-[#0B1B3D]"
                    dir="rtl"
                    style={{ textWrap: "balance" } as React.CSSProperties}
                  >
                    {p.title}
                  </h5>
                )}
              </div>
              {/* Researchers */}
              {researchers.length > 0 && (
                <div className="mb-2 space-y-0.5">
                  {researchers.map((name, ri) => (
                    <div key={ri}>
                      <p className="flex items-center gap-1 text-[11px] text-[#374151]" dir="rtl">
                        <User className="h-3 w-3 shrink-0 text-[#9CA3AF]" aria-hidden />
                        {name}
                      </p>
                      {phoneAt(p.phone, ri) && (
                        <div className="ps-4" dir="rtl">
                          <PhoneLink phone={phoneAt(p.phone, ri)} name={name} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* PDF buttons */}
              <div className="grid grid-cols-2 gap-2 border-t border-[#E2E5EC] pt-2">
                <div>
                  <p className="mb-1 text-[9px] font-bold text-[#9CA3AF]" dir="rtl">الورقة البحثية</p>
                  <PdfCell
                    url={p.paperUrl}
                    label={`ورقة ${p.slot} - ${formatResearchers(p.researcher)}`}
                    onPreview={onPreview}
                    compact
                  />
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-bold text-[#9CA3AF]" dir="rtl">السيرة الذاتية</p>
                  <PdfCell
                    url={p.cvUrl}
                    label={`سيرة ${p.slot} - ${formatResearchers(p.researcher)}`}
                    onPreview={onPreview}
                    compact
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── iPad/Desktop: Table layout (≥ 768px) ── */}
      <div className="hidden scroll-elegant overflow-x-auto md:block">
        <table
          className="w-full border-collapse text-center"
          style={{ minWidth: `${Math.max(640, count * 180)}px` }}
          dir="rtl"
        >
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
                <td key={i} className="min-w-[160px] px-3 py-3 align-middle">
                  {p.title ? (
                    <p
                      className="text-xs font-semibold leading-snug text-[#0B1B3D]"
                      dir="rtl"
                      style={{ textWrap: "balance" } as React.CSSProperties}
                    >
                      {p.title}
                    </p>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF]">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row 2: Researchers (supports multiple) */}
            <tr className="border-b border-[#E2E5EC] bg-[#FAFBFC]">
              <th
                scope="row"
                className="sticky right-0 z-10 w-28 border-l border-[#E2E5EC] bg-[#0B1B3D] px-3 py-3 text-xs font-bold text-[#D4AF37]"
                dir="rtl"
              >
                <span className="flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  الباحثون
                </span>
              </th>
              {slots.map((p, i) => {
                const researchers = parseResearchers(p.researcher);
                return (
                  <td key={i} className="min-w-[160px] px-3 py-3 align-top">
                    {researchers.length > 0 ? (
                      <div className="space-y-0.5">
                        {researchers.map((name, ri) => (
                          <div key={ri}>
                            <p
                              className="flex items-start gap-1 text-[11px] leading-snug text-[#374151]"
                              dir="rtl"
                            >
                              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#D4AF37]" aria-hidden />
                              {name}
                            </p>
                            {phoneAt(p.phone, ri) && (
                              <div className="ps-2" dir="rtl">
                                <PhoneLink phone={phoneAt(p.phone, ri)} name={name} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">—</span>
                    )}
                  </td>
                );
              })}
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
                <td key={i} className="min-w-[160px] px-2 align-middle">
                  <PdfCell
                    url={p.paperUrl}
                    label={`ورقة ${p.slot} - ${formatResearchers(p.researcher)}`}
                    onPreview={onPreview}
                  />
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
                <td key={i} className="min-w-[160px] px-2 align-middle">
                  <PdfCell
                    url={p.cvUrl}
                    label={`سيرة ${p.slot} - ${formatResearchers(p.researcher)}`}
                    onPreview={onPreview}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
