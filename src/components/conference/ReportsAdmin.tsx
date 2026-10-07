"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Loader2,
  RefreshCw,
  Inbox,
  Download,
  Eye,
  X,
  Search,
  Trash2,
  Calendar,
  User,
} from "lucide-react";
import { tracks as staticTracks } from "@/lib/tracks";
import { useSiteContentValue } from "./SiteContentProvider";

interface ReportData {
  trackId: number;
  content?: string;
  editedBy?: string;
  updatedAt?: string;
}

/**
 * Reports Admin — shows all saved session reports grouped by track.
 * Lets the admin:
 *   - View any report in a modal
 *   - Download a report as .txt
 *   - Search reports by content
 *   - Delete a report
 */
export function ReportsAdmin() {
  const { get } = useSiteContentValue();
  const [reports, setReports] = useState<Record<number, ReportData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<number>(0); // 0 = all
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ReportData | null>(null);

  // Build dynamic tracks list.
  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", String(staticTracks.length)), 10) ||
      staticTracks.length,
  );
  const dynamicTracks = Array.from({ length: trackCount }, (_, i) => {
    const id = i + 1;
    return {
      id,
      title: get(
        `track.${id}.title`,
        staticTracks.find((t) => t.id === id)?.title ?? `المحور ${id}`,
      ),
    };
  });

  const loadAll = useCallback(() => {
    setLoading(true);
    const trackIds = Array.from({ length: trackCount }, (_, i) => i + 1);
    Promise.all(
      trackIds.map((id) =>
        fetch(`/api/sessions/${id}/report`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => [id, d] as [number, ReportData])
          .catch(() => [id, { trackId: id }] as [number, ReportData]),
      ),
    )
      .then((entries) => {
        setReports(Object.fromEntries(entries) as Record<number, ReportData>);
      })
      .finally(() => setLoading(false));
  }, [trackCount]);

  useEffect(() => {
    // loadAll calls setState internally — expected for a fetch trigger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handleDelete = useCallback(
    async (trackId: number) => {
      if (!confirm(`حذف تقرير المحور ${trackId}؟`)) return;
      await fetch(`/api/sessions/${trackId}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", editedBy: "" }),
      });
      loadAll();
    },
    [loadAll],
  );

  const handleDownload = useCallback((trackId: number, report: ReportData) => {
    if (!report.content) return;
    const trackTitle =
      dynamicTracks.find((t) => t.id === trackId)?.title || `المحور ${trackId}`;
    const header = [
      `تقرير جلسة: ${trackTitle}`,
      `المحور: ${trackId}`,
      report.editedBy ? `رئيس الجلسة: ${report.editedBy}` : "",
      report.updatedAt
        ? `آخر تحديث: ${new Date(report.updatedAt).toLocaleString("ar")}`
        : "",
      "",
      "=".repeat(50),
      "",
    ]
      .filter(Boolean)
      .join("\n");
    const fullText = header + report.content;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-المحور-${trackId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dynamicTracks]);

  const q = search.trim().toLowerCase();

  const visibleTracks =
    activeTrack === 0
      ? dynamicTracks.filter((t) => {
          const r = reports[t.id];
          if (!r?.content) return false;
          if (q && !r.content.toLowerCase().includes(q)) return false;
          return true;
        })
      : dynamicTracks.filter((t) => t.id === activeTrack);

  const totalReports = Object.values(reports).filter(
    (r) => r.content && r.content.trim().length > 0,
  ).length;

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
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
              تقارير الجلسات
            </h3>
            <p className="text-xs text-[#6B7280]" dir="rtl">
              {totalReports > 0
                ? `${totalReports} تقرير محفوظ`
                : "لا تقارير محفوظة بعد"}
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
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            تحديث
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E5EC] bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في التقارير..."
            dir="rtl"
            className="h-9 w-full rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] pr-9 pl-3 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح"
              className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#9CA3AF] hover:bg-[#F5F6F8] hover:text-[#0B1B3D]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
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
          الكل ({totalReports})
        </button>
        {dynamicTracks.map((t) => {
          const hasReport = reports[t.id]?.content?.trim();
          const count = hasReport ? 1 : 0;
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
              title={t.title}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold",
                  active ? "bg-[#D4AF37] text-[#0B1B3D]" : "bg-[#F4ECD0] text-[#0B1B3D]",
                ].join(" ")}
              >
                {t.id}
              </span>
              ({count})
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

      {/* Reports list */}
      {!loading &&
        visibleTracks.map((t) => {
          const report = reports[t.id];
          if (!report?.content?.trim()) return null;
          return (
            <motion.section
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
            >
              {/* Track header */}
              <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-3 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37] text-sm font-extrabold text-[#0B1B3D]">
                    {t.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold" dir="rtl">
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] text-white/70">
                      {report.editedBy && (
                        <span className="flex items-center gap-1" dir="rtl">
                          <User className="h-2.5 w-2.5" />
                          {report.editedBy}
                        </span>
                      )}
                      {report.updatedAt && (
                        <span className="flex items-center gap-1" dir="rtl">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(report.updatedAt).toLocaleString("ar")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewing({ ...report, trackId: t.id })}
                    aria-label="عرض"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
                    dir="rtl"
                  >
                    <Eye className="h-3 w-3" aria-hidden />
                    عرض
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(t.id, report)}
                    aria-label="تحميل"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
                    dir="rtl"
                  >
                    <Download className="h-3 w-3" aria-hidden />
                    تحميل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    aria-label="حذف"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-red-500/80"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Report preview */}
              <div className="p-4">
                <p
                  className="line-clamp-3 text-xs leading-relaxed text-[#374151]"
                  dir="rtl"
                >
                  {report.content}
                </p>
              </div>
            </motion.section>
          );
        })}

      {/* Empty state */}
      {!loading && visibleTracks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E2E5EC] bg-white py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4ECD0]">
            {search ? (
              <Search className="h-8 w-8 text-[#D4AF37]" />
            ) : (
              <Inbox className="h-8 w-8 text-[#D4AF37]" />
            )}
          </span>
          <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
            {search
              ? "لا توجد تقارير مطابقة"
              : activeTrack !== 0
                ? "لا يوجد تقرير لهذا المحور بعد"
                : "لا توجد تقارير محفوظة"}
          </p>
          <p className="text-xs text-[#6B7280]" dir="rtl">
            {search
              ? "جرّب تعديل البحث"
              : "احفظ تقريراً من صفحة المحور ليظهر هنا"}
          </p>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div className="absolute inset-0 bg-[#07152F]/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37] text-sm font-extrabold text-[#0B1B3D]">
                  {viewing.trackId}
                </span>
                <div>
                  <h3 className="text-sm font-bold" dir="rtl">
                    {dynamicTracks.find((t) => t.id === viewing.trackId)?.title ||
                      `المحور ${viewing.trackId}`}
                  </h3>
                  {viewing.editedBy && (
                    <p className="text-[10px] text-white/70" dir="rtl">
                      {viewing.editedBy}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(viewing.trackId, viewing)
                  }
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
                  dir="rtl"
                >
                  <Download className="h-3 w-3" aria-hidden />
                  تحميل
                </button>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  aria-label="إغلاق"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-[#B91C1C] hover:border-[#B91C1C]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            {/* Modal content */}
            <div className="scroll-elegant overflow-y-auto p-6">
              <p
                className="whitespace-pre-wrap text-sm leading-[2] text-[#0B1B3D]"
                dir="rtl"
              >
                {viewing.content}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
