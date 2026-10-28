import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContent } from "@/lib/site-content-server";
import { trackNumber } from "@/lib/tracks";
import { RUBRIC, RUBRIC_MAX } from "@/lib/ai-prompts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/admin/evaluations — admin only (src/proxy.ts guards /api/admin/*).
 *
 * Every session with its papers and the cached AI evaluation of each
 * (table ai_evaluations, written by POST /api/ai/analyze action "evaluate").
 */
export async function GET() {
  const n = parseInt(await getContent("tracks.count"), 10) || 0;
  const [sessions, evals] = await Promise.all([
    db.trackSession.findMany({ include: { papers: { orderBy: { slot: "asc" } } } }),
    db.aiEvaluation.findMany(),
  ]);
  const rows = await db.siteContent.findMany({ where: { key: { startsWith: "track." } } });
  const content: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const get = (key: string, fallback: string) => content[key] ?? fallback;

  const tracks: unknown[] = [];
  for (let t = 1; t <= n; t++) {
    const papers = (sessions.find((s) => s.trackId === t)?.papers ?? [])
      .filter((p) => p.title || p.researcher)
      .map((p) => {
        const row = evals.find((e) => e.trackId === t && e.slot === p.slot);
        let ev: Record<string, unknown> | null = null;
        try {
          ev = row ? JSON.parse(row.data) : null;
        } catch {
          ev = null;
        }
        return {
          slot: p.slot,
          title: p.title ?? "",
          researcher: p.researcher ?? "",
          evaluation: ev
            ? {
                total: ev.total,
                grade: ev.grade,
                basis: ev.basis,
                verdict: ev.verdict,
                scores: ev.scores,
                at: row?.updatedAt,
              }
            : null,
        };
      });
    if (papers.length === 0) continue;
    tracks.push({
      trackId: t,
      number: trackNumber(get, t),
      title: get(`track.${t}.title`, `الجلسة ${t}`),
      papers,
    });
  }
  return NextResponse.json({
    rubric: RUBRIC,
    max: RUBRIC_MAX,
    tracks,
  });
}
