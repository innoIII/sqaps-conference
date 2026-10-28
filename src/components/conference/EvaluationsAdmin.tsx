"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Loader2, RefreshCw, Printer, FileDown, ScrollText, AlertCircle } from "lucide-react";
import { printReport, downloadWord, type ExportDoc } from "@/lib/report-export";
import { useSiteContentValue } from "./SiteContentProvider";
import { RichText } from "./RichText";

interface PaperRow {
  slot: number;
  title: string;
  researcher: string;
  evaluation: {
    total: number;
    grade: string;
    basis: "full" | "abstract";
    verdict: string;
  } | null;
}

interface TrackRow {
  trackId: number;
  number: string;
  title: string;
  papers: PaperRow[];
}

interface EvaluationsResponse {
  max: number;
  tracks: TrackRow[];
}

/**
 * Conference-wide view for the admin: every paper's AI evaluation in one
 * table (from the cached ai_evaluations), with letterhead export, plus the
 * draft closing statement built from the chairs' session reports.
 */
export function EvaluationsAdmin() {
  const { get } = useSiteContentValue();
  const conference = get("conference.title", "المؤتمر العلمي الدولي الثالث");
  const [data, setData] = useState<EvaluationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/evaluations", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setData((await r.json()) as EvaluationsResponse);
      })
      .catch(() => setError("تعذر تحميل التقييمات"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const max = data?.max ?? 40;
  const all = (data?.tracks ?? []).flatMap((t) => t.papers);
  const done = all.filter((p) => p.evaluation);
  const average = done.length ? done.reduce((n, p) => n + (p.evaluation?.total ?? 0), 0) / done.length : 0;

  const sessionName = (t: TrackRow) => t.title;

  /** The whole table as formal text, for the letterhead export. */
  const evaluationsDoc = (): ExportDoc => {
    const blocks: string[] = [];
    (data?.tracks ?? []).forEach((t, i) => {
      blocks.push(`${ORDINALS[i] ?? `${i + 1}`}: ${sessionName(t)}`);
      blocks.push("| الورقة | الباحث | الدرجة | التقدير |");
      blocks.push("|---|---|---|---|");
      for (const p of t.papers) {
        blocks.push(
          `| ${p.slot}. ${p.title} | ${p.researcher} | ${p.evaluation ? `${p.evaluation.total} / ${max}` : "لم يُجرَ"} | ${p.evaluation?.grade ?? "—"} |`,
        );
      }
      blocks.push("");
    });
    blocks.push(
      `عدد الأوراق المقيّمة: ${done.length} من ${all.length}، ومتوسط الدرجات: ${average.toFixed(1)} من ${max}.`,
    );
    blocks.push("التقييم استرشادي أعدّه المفكّر لمساعدة رؤساء الجلسات، والقرار النهائي للجان العلمية.");
    return {
      title: "جدول التقييم العلمي للأوراق البحثية",
      subtitle: "تقييم استرشادي وفق ثمانية معايير، لكل معيار خمس درجات",
      conference,
      body: blocks.join("\n"),
    };
  };

  const statementDoc = (): ExportDoc => ({
    title: "البيان الختامي وتوصيات المؤتمر",
    subtitle: "مسودة",
    conference,
    body: statement,
    signatures: ["رئيس اللجنة العلمية", "رئيس المؤتمر"],
  });

  const draftStatement = async () => {
    setDrafting(true);
    setStatementError(null);
    try {
      const r = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: 0, action: "final" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStatement(d.suggestedReport ?? d.reply ?? "");
    } catch (e) {
      setStatementError(e instanceof Error && e.message ? e.message : "تعذر إعداد المسودة، حاول مرة أخرى");
    } finally {
      setDrafting(false);
    }
  };

  const btn =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-white px-4 text-sm font-bold text-[#0B1B3D] transition-colors hover:bg-[#F4ECD0]/60 disabled:opacity-40";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Evaluations table */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold">التقييم العلمي للأوراق</h2>
              <p className="text-xs text-white/75">
                {loading ? "…" : `${done.length} من ${all.length} ورقة مقيّمة — المتوسط ${average.toFixed(1)} من ${max}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className={btn} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              تحديث
            </button>
            <button type="button" onClick={() => printReport(evaluationsDoc())} className={btn} disabled={!done.length}>
              <Printer className="h-4 w-4" aria-hidden />
              PDF
            </button>
            <button
              type="button"
              onClick={() => downloadWord(evaluationsDoc(), "جدول-التقييم-العلمي")}
              className={btn}
              disabled={!done.length}
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Word
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
            <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            <span className="text-sm">جاري التحميل...</span>
          </div>
        ) : error ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-[#B91C1C]">
            <AlertCircle className="h-5 w-5" aria-hidden />
            {error}
          </p>
        ) : (
          <div className="space-y-6 p-5">
            {data?.tracks.map((t) => (
              <div key={t.trackId}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0B1B3D]">
                  {t.number && (
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#0B1B3D] px-1.5 text-xs text-[#D4AF37]">
                      {t.number}
                    </span>
                  )}
                  {sessionName(t)}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[#E2E5EC]">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-[#F5F6F8] text-xs text-[#3D4A63]">
                      <tr>
                        <th className="px-3 py-2 text-right font-bold">الورقة</th>
                        <th className="px-3 py-2 text-right font-bold">الباحث</th>
                        <th className="px-3 py-2 text-center font-bold">الدرجة</th>
                        <th className="px-3 py-2 text-center font-bold">التقدير</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.papers.map((p) => (
                        <tr key={p.slot} className="border-t border-[#E2E5EC] align-top">
                          <td className="px-3 py-2 text-[#0B1B3D]">
                            <span className="font-bold">{p.slot}.</span> {p.title}
                            {p.evaluation?.verdict && (
                              <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{p.evaluation.verdict}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-[#3D4A63]">{p.researcher}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-center font-extrabold text-[#0B1B3D]">
                            {p.evaluation ? `${p.evaluation.total} / ${max}` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-bold">
                            {p.evaluation ? (
                              <span className="rounded-full bg-[#F4ECD0] px-2.5 py-1 text-[#0B1B3D]">
                                {p.evaluation.grade}
                                {p.evaluation.basis === "abstract" ? " (من الملخص)" : ""}
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF]">لم يُجرَ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="text-xs text-[#6B7280]">
              التقييم استرشادي أعدّه المفكّر من النص الكامل لكل ورقة، والقرار النهائي للجان العلمية.
            </p>
          </div>
        )}
      </section>

      {/* Closing statement */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
              <ScrollText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold">مسودة البيان الختامي</h2>
              <p className="text-xs text-white/75">تُبنى من تقارير رؤساء الجلسات المحفوظة</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={draftStatement}
              disabled={drafting}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#0B1B3D] transition hover:bg-[#E6C869] disabled:opacity-60"
            >
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ScrollText className="h-4 w-4" aria-hidden />}
              {statement ? "إعادة الإعداد" : "إعداد المسودة"}
            </button>
            <button type="button" onClick={() => printReport(statementDoc())} className={btn} disabled={!statement}>
              <Printer className="h-4 w-4" aria-hidden />
              PDF
            </button>
            <button
              type="button"
              onClick={() => downloadWord(statementDoc(), "البيان-الختامي-مسودة")}
              className={btn}
              disabled={!statement}
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Word
            </button>
          </div>
        </div>
        <div className="p-5">
          {statementError && <p className="mb-3 text-sm font-semibold text-[#B91C1C]">{statementError}</p>}
          {drafting ? (
            <p className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" aria-hidden />
              يعدّ المفكّر المسودة من تقارير الجلسات، قد يستغرق ذلك نصف دقيقة…
            </p>
          ) : statement ? (
            <div className="space-y-2 text-sm leading-relaxed text-[#0B1B3D]">
              <RichText text={statement} />
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">
              بعد أن يحفظ رؤساء الجلسات تقاريرهم، اضغط «إعداد المسودة» ليجمعها المفكّر في بيان ختامي بتوصيات موحّدة ومصنّفة.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

const ORDINALS = ["أولاً", "ثانياً", "ثالثاً", "رابعاً", "خامساً", "سادساً", "سابعاً", "ثامناً", "تاسعاً", "عاشراً"];
