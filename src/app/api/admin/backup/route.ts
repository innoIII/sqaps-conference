import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * GET /api/admin/backup
 *
 * Exports ALL data from the database as a single JSON file.
 * Includes: SiteContent, TrackSessions, ResearchPapers, SessionReports,
 *           Questions (metadata only, no PDFs).
 *
 * Response: JSON file download.
 */
export async function GET() {
  if (!dbAvailable()) {
    const body: ApiErrorPayload = { error: "قاعدة البيانات غير متاحة" };
    return NextResponse.json(body, { status: 503 });
  }

  try {
    const [siteContent, trackSessions, researchPapers, sessionReports, questions] =
      await Promise.all([
        db.siteContent.findMany(),
        db.trackSession.findMany({ include: { papers: true } }),
        db.researchPaper.findMany(),
        db.sessionReport.findMany(),
        db.question.findMany({
          select: {
            id: true,
            trackId: true,
            question: true,
            author: true,
            paperSlot: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    const backup = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        counts: {
          siteContent: siteContent.length,
          trackSessions: trackSessions.length,
          researchPapers: researchPapers.length,
          sessionReports: sessionReports.length,
          questions: questions.length,
        },
      },
      siteContent: siteContent.map((r) => ({ key: r.key, value: r.value })),
      trackSessions: trackSessions.map((r) => ({
        trackId: r.trackId,
        time: r.time,
        venue: r.venue,
        chair: r.chair,
        secretary: r.secretary,
        chairPhone: r.chairPhone,
        secretaryPhone: r.secretaryPhone,
        papers: r.papers.map((p) => ({
          slot: p.slot,
          title: p.title,
          researcher: p.researcher,
          phone: p.phone,
          paperUrl: p.paperUrl,
          cvUrl: p.cvUrl,
        })),
      })),
      sessionReports: sessionReports.map((r) => ({
        trackId: r.trackId,
        paperSlot: r.paperSlot,
        role: r.role,
        content: r.content,
        editedBy: r.editedBy,
      })),
      questions: questions,
    };

    return NextResponse.json(backup, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="sqaps-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const body: ApiErrorPayload = {
      error: e instanceof Error ? e.message : "تعذر تصدير البيانات",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
