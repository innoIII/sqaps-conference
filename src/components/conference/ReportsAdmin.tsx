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
  Layers,
  Printer,
  FileDown,
  ScrollText,
} from "lucide-react";
import { tracks as staticTracks, trackNumber } from "@/lib/tracks";
import { printReport, downloadWord, type ExportDoc } from "@/lib/report-export";
import type { ResearchPaper, TrackSessionInfo } from "@/types";
import { useSiteContentValue } from "./SiteContentProvider";

/** Session header + papers, for the export letterhead. */
interface SessionData {
  session?: TrackSessionInfo;
  papers?: ResearchPaper[];
}

interface ReportItem {
  trackId: number;
  paperSlot: number | null;
  /** "chair" (رئيس الجلسة) or "secretary" (مقرر الجلسة). */
  role?: "chair" | "secretary";
  content?: string;
  editedBy?: string;
  updatedAt?: string;
}

interface AllReportsResponse {
  trackId: number;
  reports: ReportItem[];
}

/**
 * Reports Admin — shows all saved session reports grouped by track + paper.
 * Each track has two authors (the chair and the rapporteur), and each can have:
 *   - 1 general report (paperSlot = null)
 *   - One report per paper (paperSlot = 1..N)
 *
 * Lets the admin:
 *   - View any report in a modal
 *   - Export a report, a session's final report, or all sessions as PDF/Word
 *   - Search reports by content
 *   - Delete a report
 */
/** Report kind label by author. */
function roleLabel(role: ReportItem["role"]): string {
  return role === "secretary" ? "تقرير مقرر الجلسة" : "تقرير رئيس الجلسة";
}

export function ReportsAdmin() {
  const { get } = useSiteContentValue();
  const [allReports, setAllReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<number>(0); // 0 = all
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ReportItem | null>(null);

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
        staticTracks.find((t) => t.id === id)?.title ?? `الجلسة ${id}`,
      ),
    };
  });

  const [sessions, setSessions] = useState<Record<number, SessionData>>({});

  const loadAll = useCallback(() => {
    setLoading(true);
    const trackIds = Array.from({ length: trackCount }, (_, i) => i + 1);
    // Session header + papers (for the exports) — best effort, never blocks the list.
    Promise.all(
      trackIds.map((id) =>
        fetch(`/api/sessions/${id}?fresh=${Date.now()}`, { cache: "no-store" })
          .then((r) => r.json() as Promise<SessionData>)
          .then((d) => [id, d] as const)
          .catch(() => [id, {}] as const),
      ),
    ).then((entries) => setSessions(Object.fromEntries(entries)));
    Promise.all(
      trackIds.map((id) =>
        fetch(`/api/sessions/${id}/report?paperSlot=all`, {
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((d: AllReportsResponse) => d.reports ?? [])
          .catch(() => [] as ReportItem[]),
      ),
    )
      .then((arrays) => {
        const flat = arrays.flat();
        setAllReports(flat);
      })
      .finally(() => setLoading(false));
  }, [trackCount]);

  useEffect(() => {
    // loadAll calls setState internally — expected for a fetch trigger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handleDelete = useCallback(
    async (trackId: number, paperSlot: number | null, role: ReportItem["role"] = "chair") => {
      const label = paperSlot ? `الورقة ${paperSlot}` : "التقرير العام";
      if (!confirm(`حذف ${roleLabel(role)} — ${label} للجلسة ${trackId}؟`)) return;
      await fetch(`/api/sessions/${trackId}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          editedBy: "",
          paperSlot: paperSlot ?? 0,
          role,
        }),
      });
      loadAll();
    },
    [loadAll],
  );

  // ── Letterhead exports (PDF via print, Word .doc) ──
  const conference = get("conference.title", "المؤتمر العلمي الدولي الثالث");
  const sessionName = (trackId: number) => {
    const title = dynamicTracks.find((t) => t.id === trackId)?.title || `الجلسة ${trackId}`;
    const num = trackNumber(get, trackId);
    return num ? `${num} — ${title}` : title;
  };
  const sessionMeta = (trackId: number): [string, string][] => {
    const s = sessions[trackId]?.session;
    return [
      ["الموعد", s?.time ?? ""],
      ["المكان", s?.venue ?? ""],
      ["رئيس الجلسة", s?.chair ?? ""],
      ["مقرر الجلسة", s?.secretary ?? ""],
    ];
  };
  const paperLine = (trackId: number, slot: number) => {
    const p = sessions[trackId]?.papers?.find((x) => x.slot === slot);
    return `الورقة ${slot}${p?.title ? `: ${p.title}` : ""}${p?.researcher ? ` — ${p.researcher}` : ""}`;
  };
  const savedReports = allReports.filter((r) => r.content?.trim());
  const byOrder = (a: ReportItem, b: ReportItem) => (a.paperSlot ?? 0) - (b.paperSlot ?? 0);

  /** One session's reports as body text: the chair's, then the rapporteur's. */
  const sessionBody = (trackId: number) => {
    const lines: string[] = [];
    for (const role of ["chair", "secretary"] as const) {
      const list = savedReports.filter((r) => r.trackId === trackId && (r.role ?? "chair") === role).sort(byOrder);
      lines.push(`### ${role === "secretary" ? "محضر مقرر الجلسة" : "تقرير رئيس الجلسة"}`);
      if (!list.length) {
        lines.push(role === "secretary" ? "لم يحفظ مقرر الجلسة تقريراً." : "لم يحفظ رئيس الجلسة تقريراً.", "");
        continue;
      }
      for (const r of list) {
        if (r.paperSlot) lines.push(`ملاحظات على ${paperLine(trackId, r.paperSlot)}`);
        lines.push(r.content ?? "", "");
      }
    }
    return lines.join("\n");
  };

  const reportDoc = (report: ReportItem): ExportDoc => ({
    title: report.role === "secretary" ? "محضر الجلسة" : "تقرير رئيس الجلسة",
    subtitle: report.paperSlot
      ? `${sessionName(report.trackId)} — ${paperLine(report.trackId, report.paperSlot)}`
      : sessionName(report.trackId),
    conference,
    meta: sessionMeta(report.trackId),
    body: report.content ?? "",
    signatures:
      report.role === "secretary" ? ["مقرر الجلسة", "اعتماد رئيس الجلسة"] : ["رئيس الجلسة", "مقرر الجلسة"],
  });
  const reportFile = (r: ReportItem) =>
    `${r.role === "secretary" ? "محضر-الجلسة" : "تقرير-رئيس-الجلسة"}-${r.trackId}${r.paperSlot ? `-ورقة-${r.paperSlot}` : ""}`;

  const sessionDoc = (trackId: number): ExportDoc => ({
    title: "التقرير النهائي للجلسة",
    subtitle: sessionName(trackId),
    conference,
    meta: sessionMeta(trackId),
    body: sessionBody(trackId),
    signatures: ["رئيس الجلسة", "مقرر الجلسة"],
  });

  /** Every session in one document, each on its own page. */
  const comprehensiveDoc = (): ExportDoc => {
    const withReports = new Set(savedReports.map((r) => r.trackId));
    const lines = [
      `يضم هذا التقرير تقارير رؤساء الجلسات ومحاضر مقرريها لجلسات المؤتمر (${dynamicTracks.length} جلسات)، منها ${withReports.size} جلسة حُفظت تقاريرها.`,
      "",
    ];
    for (const t of dynamicTracks) {
      lines.push(`## ${sessionName(t.id)}`);
      for (const [k, v] of sessionMeta(t.id)) if (v) lines.push(`${k}: ${v}`);
      lines.push("", sessionBody(t.id), "");
    }
    return {
      title: "التقرير الختامي الشامل لجلسات المؤتمر",
      subtitle: "تقارير رؤساء الجلسات ومحاضر المقررين",
      conference,
      body: lines.join("\n"),
      signatures: ["رئيس اللجنة العلمية", "رئيس المؤتمر"],
    };
  };

  const q = search.trim().toLowerCase();

  // Filter reports.
  const filteredReports = allReports.filter((r) => {
    if (!r.content?.trim()) return false;
    if (activeTrack !== 0 && r.trackId !== activeTrack) return false;
    if (q && !r.content.toLowerCase().includes(q)) return false;
    return true;
  });

  // Group by trackId.
  const grouped: Record<number, ReportItem[]> = {};
  for (const r of filteredReports) {
    if (!grouped[r.trackId]) grouped[r.trackId] = [];
    grouped[r.trackId].push(r);
  }
  // Sort within each group: chair before rapporteur, then general first
  // (paperSlot null), then 1, 2, 3...
  for (const k of Object.keys(grouped)) {
    grouped[Number(k)].sort((a, b) => {
      const aRole = a.role === "secretary" ? 1 : 0;
      const bRole = b.role === "secretary" ? 1 : 0;
      if (aRole !== bRole) return aRole - bRole;
      const aSlot = a.paperSlot ?? 0;
      const bSlot = b.paperSlot ?? 0;
      return aSlot - bSlot;
    });
  }

  const totalReports = allReports.filter(
    (r) => r.content?.trim().length ?? 0 > 0,
  ).length;

  // Helper: get paper label.
  const getPaperLabel = (r: ReportItem): string => {
    if (!r.paperSlot) return "تقرير عام";
    return `الورقة ${r.paperSlot}`;
  };

  // Helper: get paper badge color.
  const getPaperBadgeClass = (r: ReportItem): string => {
    if (!r.paperSlot) return "bg-[#D4AF37] text-[#0B1B3D]"; // general = gold
    return "bg-[#0B1B3D] text-[#D4AF37]"; // paper = navy
  };

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

      {/* Comprehensive report: every session's chair report + minutes in one document */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] p-4 text-white shadow-sm" dir="rtl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
            <ScrollText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold">التقرير الختامي الشامل</h3>
            <p className="text-xs text-white/70">
              كل الجلسات في ملف واحد، لكل جلسة صفحة: بياناتها، تقرير رئيسها، ومحضر مقررها
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => printReport(comprehensiveDoc())}
            disabled={loading || savedReports.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#0B1B3D] transition hover:bg-[#E6C869] disabled:opacity-50"
          >
            <Printer className="h-4 w-4" aria-hidden />
            PDF
          </button>
          <button
            type="button"
            onClick={() => downloadWord(comprehensiveDoc(), "التقرير-الختامي-الشامل")}
            disabled={loading || savedReports.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-white/10 px-4 text-sm font-bold text-[#D4AF37] transition hover:bg-white/20 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Word
          </button>
        </div>
      </div>

      {/* Search */}
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
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
            activeTrack === 0
              ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
              : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
          ].join(" ")}
          dir="rtl"
        >
          الكل ({totalReports})
        </button>
        {dynamicTracks.map((t) => {
          const count = allReports.filter(
            (r) => r.trackId === t.id && r.content?.trim(),
          ).length;
          const active = activeTrack === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTrack(t.id)}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
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

      {/* Reports grouped by track */}
      {!loading &&
        Object.entries(grouped).map(([trackIdStr, reports]) => {
          const trackId = Number(trackIdStr);
          const trackTitle =
            dynamicTracks.find((t) => t.id === trackId)?.title ||
            `الجلسة ${trackId}`;
          return (
            <motion.section
              key={trackId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
            >
              {/* Track header */}
              <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-3 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37] text-sm font-extrabold text-[#0B1B3D]">
                    {trackId}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold" dir="rtl">
                      {trackTitle}
                    </h4>
                    <p className="text-[10px] text-white/70" dir="rtl">
                      {reports.length} تقرير محفوظ
                    </p>
                  </div>
                </div>
                {/* Final report of this session: the chair's report + the rapporteur's minutes */}
                <div className="flex shrink-0 flex-wrap items-center gap-1.5" dir="rtl">
                  <span className="hidden text-[10px] text-white/70 sm:inline">التقرير النهائي للجلسة:</span>
                  <button
                    type="button"
                    onClick={() => printReport(sessionDoc(trackId))}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#D4AF37] px-2.5 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:bg-[#E6C869]"
                  >
                    <Printer className="h-3 w-3" aria-hidden />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadWord(sessionDoc(trackId), `التقرير-النهائي-للجلسة-${trackId}`)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D4AF37]/60 bg-white/10 px-2.5 text-[11px] font-bold text-[#D4AF37] transition-colors hover:bg-white/20"
                  >
                    <FileDown className="h-3 w-3" aria-hidden />
                    Word
                  </button>
                </div>
              </div>

              {/* Reports within this track — the chair's and the rapporteur's
                  side by side, so the conference director can follow both. */}
              <div className="grid grid-cols-1 divide-y divide-[#E2E5EC] lg:grid-cols-2 lg:divide-y-0 lg:divide-x lg:divide-x-reverse">
                {(["chair", "secretary"] as const).map((col) => {
                  const colReports = reports.filter((r) => (r.role ?? "chair") === col);
                  return (
                    <div key={col} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2">
                        <h5 className="text-xs font-bold text-[#0B1B3D]" dir="rtl">
                          {roleLabel(col)}
                        </h5>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            colReports.length
                              ? "bg-[#F4ECD0] text-[#0B1B3D]"
                              : "bg-white text-[#9CA3AF]"
                          }`}
                          dir="rtl"
                        >
                          {colReports.length ? `${colReports.length} محفوظ` : "لم يُكتب بعد"}
                        </span>
                      </div>
                      {colReports.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-[#9CA3AF]" dir="rtl">
                          {col === "secretary"
                            ? "لم يحفظ مقرر الجلسة أي تقرير بعد"
                            : "لم يحفظ رئيس الجلسة أي تقرير بعد"}
                        </p>
                      ) : (
              <ul className="divide-y divide-[#E2E5EC]">
                {colReports.map((report, idx) => (
                  <li
                    key={`${report.trackId}-${report.role ?? "chair"}-${report.paperSlot ?? "general"}-${idx}`}
                    className="group flex items-start gap-3 p-4 transition-colors hover:bg-[#F5F6F8]"
                  >
                    {/* Paper badge */}
                    <span
                      className={`flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-bold ${getPaperBadgeClass(report)}`}
                      dir="rtl"
                    >
                      {report.paperSlot ? (
                        <FileText className="h-2.5 w-2.5" aria-hidden />
                      ) : (
                        <Layers className="h-2.5 w-2.5" aria-hidden />
                      )}
                      {getPaperLabel(report)}
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Preview */}
                      <p
                        className="line-clamp-2 text-xs leading-relaxed text-[#0B1B3D]"
                        dir="rtl"
                      >
                        {report.content}
                      </p>
                      {/* Meta */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[#9CA3AF]">
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

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewing(report)}
                        aria-label="عرض"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#0B1B3D] hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => printReport(reportDoc(report))}
                        aria-label="PDF"
                        title="PDF بترويسة الأكاديمية"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#D4AF37] hover:text-[#0B1B3D]"
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadWord(reportDoc(report), reportFile(report))}
                        aria-label="Word"
                        title="Word بترويسة الأكاديمية"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#D4AF37] hover:text-[#0B1B3D]"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(report.trackId, report.paperSlot, report.role)
                        }
                        aria-label="حذف"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}

      {/* Empty state */}
      {!loading && filteredReports.length === 0 && (
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
                ? "لا توجد تقارير لهذا المحور بعد"
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
                      `الجلسة ${viewing.trackId}`}
                  </h3>
                  <p className="text-[10px] text-white/70" dir="rtl">
                    {roleLabel(viewing.role)} · {getPaperLabel(viewing)}
                    {viewing.editedBy ? ` · ${viewing.editedBy}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printReport(reportDoc(viewing))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
                  dir="rtl"
                >
                  <Printer className="h-3 w-3" aria-hidden />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadWord(reportDoc(viewing), reportFile(viewing))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
                  dir="rtl"
                >
                  <FileDown className="h-3 w-3" aria-hidden />
                  Word
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
