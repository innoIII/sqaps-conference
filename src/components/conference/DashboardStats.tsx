"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageCircleQuestion,
  FileText,
  FileCheck,
  FileBadge,
  Users,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { tracks as staticTracks } from "@/lib/tracks";
import { useSiteContentValue } from "./SiteContentProvider";

interface DashboardStats {
  totalQuestions: number;
  totalReports: number;
  totalPapers: number;
  totalPdfFiles: number;
  questionsByTrack: { trackId: number; count: number }[];
  reportsByTrack: { trackId: number; count: number }[];
  papersByTrack: { trackId: number; count: number }[];
}

/**
 * DashboardStats — a premium stats grid shown at the top of the admin page.
 *
 * Shows 4 summary cards:
 *   - Total questions (from audience)
 *   - Total reports (saved session reports)
 *   - Total papers (research papers with titles)
 *   - Total PDF files (uploaded paper + CV files)
 *
 * Each card has:
 *   - An icon (gold gradient badge)
 *   - A count-up animation
 *   - A label
 *   - A hover effect (lift + gold border)
 *
 * Below the cards: a per-track breakdown table showing questions/reports/papers
 * for each track side by side.
 */
export function DashboardStats() {
  const { get } = useSiteContentValue();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", String(staticTracks.length)), 10) ||
      staticTracks.length,
  );

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel.
      const [questionsRes, reportsRes, sessionsRes] = await Promise.all([
        fetch("/api/questions?all=1", { cache: "no-store" }).catch(() => null),
        ...Array.from({ length: trackCount }, (_, i) =>
          fetch(`/api/sessions/${i + 1}/report?paperSlot=all`, {
            cache: "no-store",
          }).catch(() => null),
        ),
        ...Array.from({ length: trackCount }, (_, i) =>
          fetch(`/api/sessions/${i + 1}`, { cache: "no-store" }).catch(
            () => null,
          ),
        ),
      ]);

      // Parse questions.
      let totalQuestions = 0;
      const questionsByTrack: { trackId: number; count: number }[] = [];
      if (questionsRes && questionsRes.ok) {
        const qData = await questionsRes.json().catch(() => ({ questions: [] }));
        const questions = qData.questions ?? [];
        totalQuestions = questions.length;
        for (let i = 1; i <= trackCount; i++) {
          const count = questions.filter((q: { trackId?: number }) => q.trackId === i).length;
          questionsByTrack.push({ trackId: i, count });
        }
      } else {
        for (let i = 1; i <= trackCount; i++) {
          questionsByTrack.push({ trackId: i, count: 0 });
        }
      }

      // Parse reports (from the report fetches).
      let totalReports = 0;
      const reportsByTrack: { trackId: number; count: number }[] = [];
      const reportsResults = Array.from({ length: trackCount }, (_, i) => i + 1);
      for (const trackId of reportsResults) {
        const res = await fetch(`/api/sessions/${trackId}/report?paperSlot=all`, {
          cache: "no-store",
        }).catch(() => null);
        let count = 0;
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const reports = data.reports ?? [];
          count = reports.filter(
            (r: { content?: string }) => r.content && r.content.trim().length > 0,
          ).length;
        }
        totalReports += count;
        reportsByTrack.push({ trackId, count });
      }

      // Parse sessions + papers.
      let totalPapers = 0;
      let totalPdfFiles = 0;
      const papersByTrack: { trackId: number; count: number }[] = [];
      for (let trackId = 1; trackId <= trackCount; trackId++) {
        const res = await fetch(`/api/sessions/${trackId}`, {
          cache: "no-store",
        }).catch(() => null);
        let paperCount = 0;
        let pdfCount = 0;
        if (res && res.ok) {
          const data = await res.json().catch(() => ({ papers: [] }));
          const papers = data.papers ?? [];
          for (const p of papers) {
            if (p.title && p.title.trim()) {
              paperCount++;
            }
            if (p.paperUrl) pdfCount++;
            if (p.cvUrl) pdfCount++;
          }
        }
        totalPapers += paperCount;
        totalPdfFiles += pdfCount;
        papersByTrack.push({ trackId, count: paperCount });
      }

      setStats({
        totalQuestions,
        totalReports,
        totalPapers,
        totalPdfFiles,
        questionsByTrack,
        reportsByTrack,
        papersByTrack,
      });
    } catch {
      // Silently fail — the admin still works without stats.
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [trackCount]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const cards = [
    {
      icon: MessageCircleQuestion,
      label: "أسئلة الجمهور",
      value: stats?.totalQuestions ?? 0,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      icon: FileText,
      label: "التقارير المحفوظة",
      value: stats?.totalReports ?? 0,
      color: "from-green-500 to-green-600",
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      icon: FileCheck,
      label: "الأوراق البحثية",
      value: stats?.totalPapers ?? 0,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      icon: FileBadge,
      label: "ملفات PDF",
      value: stats?.totalPdfFiles ?? 0,
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
  ];

  return (
    <section className="mb-6">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37]">
            <TrendingUp className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
              إحصائيات سريعة
            </h2>
            <p className="text-[10px] text-[#9CA3AF]" dir="rtl">
              نظرة عامة على المحتوى
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E5EC] bg-white text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#F4ECD0]/40 disabled:opacity-50"
          aria-label="تحديث"
          title="تحديث الإحصائيات"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </div>

      {/* Stats grid — 4 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-sm transition hover:border-[#D4AF37]/40 hover:shadow-lg"
          >
            {/* Top accent — appears on hover */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent transition-transform duration-500 group-hover:scale-x-100"
            />
            <div className="flex items-center justify-between gap-2">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.text} transition-transform group-hover:scale-110`}
              >
                <card.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-[#0B1B3D] sm:text-3xl">
                {loading ? "—" : card.value}
              </span>
            </div>
            <p
              className="mt-2 text-xs font-semibold text-[#6B7280]"
              dir="rtl"
            >
              {card.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Per-track breakdown table */}
      {!loading && stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-4 overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
        >
          <div className="border-b border-[#E2E5EC] bg-[#F5F6F8] px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]" dir="rtl">
              <Users className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              التفصيل حسب المحور
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" dir="rtl">
              <thead>
                <tr className="border-b border-[#E2E5EC] text-[#9CA3AF]">
                  <th className="px-4 py-2 font-semibold">المحور</th>
                  <th className="px-4 py-2 font-semibold text-center">الأسئلة</th>
                  <th className="px-4 py-2 font-semibold text-center">التقارير</th>
                  <th className="px-4 py-2 font-semibold text-center">الأوراق</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: trackCount }, (_, i) => i + 1).map((trackId) => {
                  const qCount =
                    stats.questionsByTrack.find((q) => q.trackId === trackId)?.count ?? 0;
                  const rCount =
                    stats.reportsByTrack.find((r) => r.trackId === trackId)?.count ?? 0;
                  const pCount =
                    stats.papersByTrack.find((p) => p.trackId === trackId)?.count ?? 0;
                  const trackTitle =
                    get(`track.${trackId}.title`, `الجلسة ${trackId}`) || `الجلسة ${trackId}`;
                  return (
                    <tr
                      key={trackId}
                      className="border-b border-[#E2E5EC] last:border-0 transition-colors hover:bg-[#F5F6F8]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0B1B3D] text-[10px] font-bold text-[#D4AF37]">
                            {trackId}
                          </span>
                          <span className="truncate text-[11px] font-semibold text-[#0B1B3D]">
                            {trackTitle}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                            qCount > 0
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {qCount}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                            rCount > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {rCount}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                            pCount > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {pCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </section>
  );
}
