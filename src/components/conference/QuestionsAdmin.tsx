"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Loader2,
  RefreshCw,
  Inbox,
  MessageCircleQuestion,
  Search,
  FileText,
  Filter,
  X,
  Brain,
  Sparkles,
  AlertCircle,
  Printer,
  FileDown,
} from "lucide-react";
import { tracks as staticTracks, trackNumber } from "@/lib/tracks";
import { printReport, downloadWord, type ExportDoc } from "@/lib/report-export";
import { confirmDelete } from "@/lib/confirm-delete";
import { useSiteContentValue } from "./SiteContentProvider";
import type { AudienceQuestion, ResearchPaper } from "@/types";

/**
 * Admin tab — "إدارة الأسئلة".
 *
 * Features:
 *   - Shows ALL questions across ALL tracks (dynamic count), grouped by track
 *   - Search box filters questions by text/author
 *   - Per-question paper badge (which paper the audience asked about)
 *   - Filter buttons: All / per-track / "questions only" / "with papers only"
 *   - Delete a single question / clear a track / clear all
 *   - Export PDF/Word: per-session statistics, then every question (all
 *     sessions, or the selected one), with or without the askers' names
 *
 * Reads the dynamic track list from useSiteContentValue so tracks
 * added/removed in the "محتوى الموقع" tab appear here immediately.
 *
 * Icons were removed per request — tracks are identified by number only.
 */
/** A single question item in the admin list — with AI answer capability. */
function AdminQuestionItem({
  q,
  index,
  paperLabel,
  onDelete,
}: {
  q: AudienceQuestion;
  index: number;
  paperLabel: string | null;
  onDelete: (id: string) => void;
}) {
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const handleGetAnswer = useCallback(async () => {
    if (answerLoading) return;
    setAnswerLoading(true);
    setAnswerError(null);
    if (answer) {
      setAnswer(null);
      setAnswerLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: q.trackId,
          mode: "answer",
          question: q.question,
          paperSlot: q.paperSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل الحصول على الإجابة");
      }
      setAnswer(data.answer || data.reply || "");
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setAnswerLoading(false);
    }
  }, [answerLoading, answer, q.trackId, q.question, q.paperSlot]);

  return (
    <li className="group flex items-start gap-3 p-4 transition-colors hover:bg-[#F5F6F8]">
      {/* Question index */}
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F4ECD0] text-[10px] font-bold text-[#0B1B3D]">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-[#0B1B3D]" dir="rtl">
          {q.question}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#9CA3AF]">
          {q.author && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#0B1B3D]/5 px-2 py-0.5 font-bold text-[#0B1B3D]"
              dir="rtl"
            >
              {q.author}
            </span>
          )}
          {q.createdAt && (
            <span dir="rtl">{new Date(q.createdAt).toLocaleString("ar")}</span>
          )}
          {paperLabel && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-2 py-0.5 font-bold text-[#0B1B3D]"
              dir="rtl"
            >
              <FileText className="h-3 w-3 text-[#D4AF37]" aria-hidden />
              {paperLabel}
            </span>
          )}
          {q.status === "ANSWERED" && (
            <span
              className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700"
              dir="rtl"
            >
              تمت الإجابة
            </span>
          )}
        </div>

        {/* AI Answer action row */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetAnswer}
            disabled={answerLoading}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#F4ECD0]/60 px-2.5 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37] disabled:opacity-50"
            dir="rtl"
          >
            {answerLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                يبحث في الورقة...
              </>
            ) : answer ? (
              <>
                <X className="h-3 w-3" aria-hidden />
                إخفاء الإجابة
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                إجابة المفكّر
              </>
            )}
          </button>
        </div>

        {/* AI Answer display */}
        <AnimatePresence>
          {(answer || answerError || answerLoading) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#F4ECD0]/40 to-white p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  <span className="text-[11px] font-bold text-[#0B1B3D]" dir="rtl">
                    إجابة المفكّر
                  </span>
                  {paperLabel && (
                    <span className="text-[10px] text-[#9CA3AF]" dir="rtl">
                      (بناءً على {paperLabel})
                    </span>
                  )}
                </div>
                {answerLoading && (
                  <div className="flex items-center gap-2 py-2 text-xs text-[#6B7280]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
                    <span dir="rtl">يحلل الورقة البحثية ويبحث عن الإجابة...</span>
                  </div>
                )}
                {answerError && !answerLoading && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]" dir="rtl">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {answerError}
                  </p>
                )}
                {answer && !answerLoading && (
                  <p
                    className="whitespace-pre-wrap text-xs leading-[1.9] text-[#0B1B3D]"
                    dir="rtl"
                  >
                    {answer}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => {
          const text = q.question.length > 80 ? `${q.question.slice(0, 80)}…` : q.question;
          if (confirmDelete(`حذف هذا السؤال؟\n«${text}»`)) onDelete(q.id);
        }}
        aria-label="حذف"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-[#B91C1C]"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

export function QuestionsAdmin() {
  const { get } = useSiteContentValue();
  const [byTrack, setByTrack] = useState<Record<number, AudienceQuestion[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<number>(0); // 0 = all tracks
  const [search, setSearch] = useState("");
  const [filterPaper, setFilterPaper] = useState<"all" | "with-paper" | "general">("all");
  const [papers, setPapers] = useState<Record<number, ResearchPaper[]>>({});
  const [showNames, setShowNames] = useState(true);

  // Build dynamic tracks list from content (respects admin edits + count).
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
      subtitle: get(
        `track.${id}.subtitle`,
        staticTracks.find((t) => t.id === id)?.subtitle ?? "",
      ),
    };
  });

  const loadAll = useCallback(() => {
    setLoading(true);
    const trackIds = Array.from({ length: trackCount }, (_, i) => i + 1);
    // Paper titles for the export — best effort, never blocks the list.
    Promise.all(
      trackIds.map((id) =>
        fetch(`/api/sessions/${id}?fresh=${Date.now()}`, { cache: "no-store" })
          .then((r) => r.json() as Promise<{ papers?: ResearchPaper[] }>)
          .then((d) => [id, d.papers ?? []] as const)
          .catch(() => [id, [] as ResearchPaper[]] as const),
      ),
    ).then((entries) => setPapers(Object.fromEntries(entries)));
    Promise.all(
      trackIds.map((id) =>
        fetch(`/api/questions?trackId=${id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => [id, d.questions ?? []] as [number, AudienceQuestion[]])
          .catch(() => [id, []] as [number, AudienceQuestion[]]),
      ),
    )
      .then((entries) => {
        setByTrack(Object.fromEntries(entries) as Record<number, AudienceQuestion[]>);
      })
      .finally(() => setLoading(false));
  }, [trackCount]);

  // Initial load — run once on mount + when the track count changes.
  useEffect(() => {
    // loadAll calls setState internally — that's expected for a fetch trigger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  // Filtered + searched questions per track.
  const filteredByTrack = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: Record<number, AudienceQuestion[]> = {};
    for (const [idStr, qs] of Object.entries(byTrack)) {
      const id = Number(idStr);
      let list = qs;
      if (q) {
        list = list.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            (item.author ?? "").toLowerCase().includes(q),
        );
      }
      if (filterPaper === "with-paper") {
        list = list.filter((item) => item.paperSlot && item.paperSlot > 0);
      } else if (filterPaper === "general") {
        list = list.filter((item) => !item.paperSlot || item.paperSlot === 0);
      }
      if (activeTrack !== 0 && id !== activeTrack) continue;
      out[id] = list;
    }
    return out;
  }, [byTrack, search, filterPaper, activeTrack]);

  const totalCount = Object.values(filteredByTrack).reduce(
    (sum, qs) => sum + qs.length,
    0,
  );

  const totalRaw = Object.values(byTrack).reduce(
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

  // Confirmed (typed «حذف») by the buttons that call these.
  const handleClearTrack = useCallback(
    async (trackId: number) => {
      await fetch(`/api/questions?trackId=${trackId}`, { method: "DELETE" });
      loadAll();
    },
    [loadAll],
  );

  const handleClearAll = useCallback(async () => {
    await fetch("/api/questions?all=true", { method: "DELETE" });
    loadAll();
  }, [loadAll]);

  // Determine which tracks to show — in "All" mode, hide tracks with 0 questions
  // (after filtering) for a cleaner view. In per-track mode, always show.
  const visibleTracks =
    activeTrack === 0
      ? dynamicTracks.filter((t) => (filteredByTrack[t.id]?.length ?? 0) > 0)
      : dynamicTracks.filter((t) => t.id === activeTrack);

  // Helper: format the paper title for a question (looks it up by trackId+slot).
  const paperLabel = (trackId: number | undefined, slot?: number | null): string | null => {
    if (!slot || slot <= 0) return null;
    // We don't have papers loaded here; just show "ورقة N".
    return `ورقة ${slot}`;
  };

  // ── Letterhead export (PDF via print, Word .doc) ──
  // Always every question of the selected session(s): search and the paper
  // filter only narrow the list on screen.
  const conference = get("conference.title", "المؤتمر العلمي الدولي الثالث");
  const sessionName = (trackId: number) => {
    const title = dynamicTracks.find((t) => t.id === trackId)?.title || `الجلسة ${trackId}`;
    const num = trackNumber(get, trackId);
    return num ? `${num} — ${title}` : title;
  };
  // Audience text goes on one line (the exporter reads line starts as
  // headings), and "|" would split a table cell.
  const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
  const cell = (s: string) => oneLine(s).replace(/\|/g, "/");
  const paperTitle = (trackId: number, slot: number) => {
    const p = papers[trackId]?.find((x) => x.slot === slot);
    return `الورقة ${slot}${p?.title ? `: ${oneLine(p.title)}` : ""}`;
  };
  const exportTracks =
    activeTrack === 0 ? dynamicTracks : dynamicTracks.filter((t) => t.id === activeTrack);
  const exportCount = exportTracks.reduce((sum, t) => sum + (byTrack[t.id]?.length ?? 0), 0);

  const questionsDoc = (): ExportDoc => {
    const list = (id: number) =>
      [...(byTrack[id] ?? [])].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    const onPaper = (qs: AudienceQuestion[]) =>
      qs.filter((q) => q.paperSlot && q.paperSlot > 0).length;
    const lines = [
      "أولاً: إحصائيات الأسئلة حسب الجلسات",
      "| الجلسة | عدد الأسئلة | عن ورقة | أسئلة عامة |",
      "|---|---|---|---|",
    ];
    for (const t of exportTracks) {
      const qs = list(t.id);
      lines.push(`| ${cell(sessionName(t.id))} | ${qs.length} | ${onPaper(qs)} | ${qs.length - onPaper(qs)} |`);
    }
    if (exportTracks.length > 1) {
      const all = exportTracks.flatMap((t) => list(t.id));
      lines.push(`| المجموع | ${all.length} | ${onPaper(all)} | ${all.length - onPaper(all)} |`);
    }
    lines.push("", "ثانياً: أسئلة الجمهور", "");
    for (const t of exportTracks) {
      const qs = list(t.id);
      if (!qs.length) continue;
      lines.push(
        `## ${sessionName(t.id)}`,
        "### عدد الأسئلة لكل ورقة",
        "| الورقة | الباحث | عدد الأسئلة |",
        "|---|---|---|",
      );
      // Papers with a title, plus any slot the audience asked about.
      const slots = new Set([
        ...(papers[t.id] ?? []).filter((p) => p.title?.trim()).map((p) => p.slot),
        ...qs.map((q) => q.paperSlot ?? 0).filter((s) => s > 0),
      ]);
      const sorted = [...slots].sort((a, b) => a - b);
      // Researchers are one per line in the session data.
      const researcher = (slot: number) =>
        (papers[t.id]?.find((p) => p.slot === slot)?.researcher ?? "")
          .split(/\r?\n/)
          .map((name) => oneLine(name))
          .filter(Boolean)
          .join("، ");
      for (const slot of sorted) {
        lines.push(
          `| ${cell(paperTitle(t.id, slot))} | ${cell(researcher(slot))} | ${qs.filter((q) => q.paperSlot === slot).length} |`,
        );
      }
      lines.push(`| أسئلة عامة | — | ${qs.length - onPaper(qs)} |`, "");
      // The questions, grouped by paper (its title and researcher once, as a
      // heading), then the general ones; numbered through the session.
      const groups = [
        ...sorted.map((slot) => ({ slot, items: qs.filter((q) => q.paperSlot === slot) })),
        { slot: 0, items: qs.filter((q) => !q.paperSlot || q.paperSlot <= 0) },
      ];
      let n = 0;
      for (const { slot, items } of groups) {
        if (!items.length) continue;
        const by = slot ? researcher(slot) : "";
        const byLabel = by.includes("، ") ? "الباحثون" : "الباحث";
        lines.push(
          slot ? `### ${paperTitle(t.id, slot)}` : "### أسئلة عامة عن الجلسة",
          `${by ? `${byLabel}: ${by} · ` : ""}عدد الأسئلة: ${items.length}`,
          showNames ? "| م | السؤال | السائل | التاريخ |" : "| م | السؤال | التاريخ |",
          showNames ? "|---|---|---|---|" : "|---|---|---|",
        );
        for (const q of items) {
          const row = [
            String(++n),
            cell(q.question),
            ...(showNames ? [cell(q.author ?? "") || "—"] : []),
            q.createdAt ? new Date(q.createdAt).toLocaleDateString("ar", { day: "numeric", month: "long" }) : "",
          ];
          lines.push(`| ${row.join(" | ")} |`);
        }
        lines.push("");
      }
    }
    return {
      title: "تقرير أسئلة الجمهور",
      subtitle: activeTrack === 0 ? "جميع الجلسات" : sessionName(activeTrack),
      conference,
      meta: [["عدد الأسئلة", String(exportCount)]],
      body: lines.join("\n"),
    };
  };
  const exportFile = activeTrack === 0 ? "أسئلة-الجمهور" : `أسئلة-الجمهور-الجلسة-${activeTrack}`;

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
              {totalRaw > 0
                ? `${totalRaw} سؤال${totalCount !== totalRaw ? ` · ${totalCount} مطابق` : ""}`
                : "لا أسئلة"}
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
          {totalRaw > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirmDelete(`حذف جميع الأسئلة من كل الجلسات (${totalRaw} سؤال)؟`)) handleClearAll();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-red-100"
              dir="rtl"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              حذف الكل
            </button>
          )}
        </div>
      </div>

      {/* Export: statistics + every question of the selected session(s) */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] p-4 text-white shadow-sm"
        dir="rtl"
      >
        <div>
          <h3 className="text-sm font-bold">تقرير الأسئلة</h3>
          <p className="text-xs text-white/70">
            {activeTrack === 0 ? "جميع الجلسات" : sessionName(activeTrack)} · {exportCount} سؤال · إحصائيات لكل جلسة وورقة، ثم الأسئلة مع عنوان كل ورقة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold">
            <input
              type="checkbox"
              checked={showNames}
              onChange={(e) => setShowNames(e.target.checked)}
              className="h-4 w-4 accent-[#D4AF37]"
            />
            إظهار أسماء السائلين
          </label>
          <button
            type="button"
            onClick={() => printReport(questionsDoc())}
            disabled={loading || exportCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#0B1B3D] transition hover:bg-[#E6C869] disabled:opacity-50"
          >
            <Printer className="h-4 w-4" aria-hidden />
            PDF
          </button>
          <button
            type="button"
            onClick={() => downloadWord(questionsDoc(), exportFile)}
            disabled={loading || exportCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-white/10 px-4 text-sm font-bold text-[#D4AF37] transition hover:bg-white/20 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Word
          </button>
        </div>
      </div>

      {/* Search + filter row */}
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
            placeholder="ابحث في الأسئلة أو الأسماء..."
            dir="rtl"
            className="h-9 w-full rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] pr-9 pl-3 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#9CA3AF] hover:bg-[#F5F6F8] hover:text-[#0B1B3D]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden />
          <button
            type="button"
            onClick={() => setFilterPaper("all")}
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
              filterPaper === "all"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setFilterPaper("with-paper")}
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
              filterPaper === "with-paper"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            <FileText className="h-3 w-3" aria-hidden />
            عن ورقة
          </button>
          <button
            type="button"
            onClick={() => setFilterPaper("general")}
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
              filterPaper === "general"
                ? "border-[#D4AF37] bg-[#0B1B3D] text-white"
                : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/40",
            ].join(" ")}
            dir="rtl"
          >
            عام
          </button>
        </div>
      </div>

      {/* Track filter — dynamic, number-only chips */}
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
          الكل ({totalRaw})
        </button>
        {dynamicTracks.map((t) => {
          const count = byTrack[t.id]?.length ?? 0;
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

      {/* Questions grouped by track */}
      {!loading &&
        visibleTracks.map((t) => {
          const qs = filteredByTrack[t.id] ?? [];
          if (qs.length === 0 && activeTrack !== 0) return null;
          return (
            <motion.section
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
            >
              {/* Track header — no icon, just number + title */}
              <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-3 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37] text-sm font-extrabold text-[#0B1B3D]">
                    {t.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold" dir="rtl">
                      {t.title}
                    </h4>
                    <p className="text-[10px] text-white/80" dir="rtl">
                      {qs.length} سؤال
                      {qs.length !== (byTrack[t.id]?.length ?? 0) &&
                        ` · من ${byTrack[t.id]?.length ?? 0}`}
                    </p>
                  </div>
                </div>
                {qs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const n = byTrack[t.id]?.length ?? 0;
                      if (confirmDelete(`حذف جميع أسئلة «${t.title}» (${n} سؤال)؟`)) handleClearTrack(t.id);
                    }}
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
                    {search || filterPaper !== "all"
                      ? "لا توجد أسئلة مطابقة"
                      : "لا أسئلة"}
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-[#E2E5EC]">
                  {qs.map((q, idx) => {
                    const paper = paperLabel(q.trackId, q.paperSlot);
                    return (
                      <AdminQuestionItem
                        key={q.id}
                        q={q}
                        index={idx}
                        paperLabel={paper}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </ul>
              )}
            </motion.section>
          );
        })}

      {/* Empty state */}
      {!loading && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E2E5EC] bg-white py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4ECD0]">
            {search || filterPaper !== "all" ? (
              <Search className="h-8 w-8 text-[#D4AF37]" />
            ) : (
              <Inbox className="h-8 w-8 text-[#D4AF37]" />
            )}
          </span>
          <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
            {search || filterPaper !== "all"
              ? "لا توجد أسئلة مطابقة"
              : "لا توجد أسئلة حاليًا"}
          </p>
          <p className="text-xs text-[#6B7280]" dir="rtl">
            {search || filterPaper !== "all"
              ? "جرّب تعديل البحث أو الفلتر"
              : "ستظهر الأسئلة هنا فور طرحها من الجمهور"}
          </p>
          {(search || filterPaper !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterPaper("all");
                setActiveTrack(0);
              }}
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
              dir="rtl"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              مسح الفلاتر
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
