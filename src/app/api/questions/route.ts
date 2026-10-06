import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validTrackIds } from "@/lib/tracks";
import type { AudienceQuestion, ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";

/** Whether the DB is likely usable (postgres URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * GET /api/questions?trackId=N
 *
 * Returns all questions for a given track, newest first. Used by the
 * QuestionsButton to display the track-specific Q&A list.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "1", 10);

  if (!validTrackIds.includes(trackId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!dbAvailable()) {
    return NextResponse.json({ questions: [], source: "local" as const });
  }

  try {
    const rows = await db.question.findMany({
      where: { trackId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const questions: AudienceQuestion[] = rows.map((r) => ({
      id: r.id,
      question: r.question,
      author: r.author ?? undefined,
      trackId: r.trackId,
      createdAt: r.createdAt.toISOString(),
      status: (r.status as "NEW" | "ANSWERED" | "ARCHIVED") ?? "NEW",
    }));
    return NextResponse.json(
      { questions, source: "local" as const },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ questions: [], source: "local" as const });
  }
}

/**
 * POST /api/questions
 *
 * Submits a new audience question. Body: { trackId: number, question: string, author?: string }
 *
 * The question is saved in the DB with the given trackId — it will only appear
 * in the Q&A panel for that track (chairs of other tracks won't see it).
 */
export async function POST(request: Request) {
  let trackId: number;
  let question: string;
  let author: string | undefined;

  try {
    const json = await request.json();
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    question = String(json.question ?? "").trim();
    author = json.author ? String(json.author).trim() : undefined;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!validTrackIds.includes(trackId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!question) {
    const body: ApiErrorPayload = { error: "السؤال فارغ" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!dbAvailable()) {
    const body: ApiErrorPayload = {
      error: "قاعدة البيانات غير متاحة — تعذر حفظ السؤال",
    };
    return NextResponse.json(body, { status: 503 });
  }

  try {
    const row = await db.question.create({
      data: { trackId, question, author, status: "NEW" },
    });
    const result: AudienceQuestion & ApiSuccessResponse = {
      success: true,
      id: row.id,
      question: row.question,
      author: row.author ?? undefined,
      trackId: row.trackId,
      createdAt: row.createdAt.toISOString(),
      status: "NEW",
    };
    return NextResponse.json(result);
  } catch {
    const body: ApiErrorPayload = { error: "تعذر حفظ السؤال" };
    return NextResponse.json(body, { status: 500 });
  }
}
