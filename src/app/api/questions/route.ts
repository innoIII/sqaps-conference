import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validTrackIds } from "@/lib/tracks";
import {
  memoryCreateQuestion,
  memoryGetQuestions,
} from "@/lib/questions-memory";
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
 * Returns all questions for a given track, newest first.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "1", 10);

  if (!validTrackIds.includes(trackId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  // Try DB first; fall back to in-memory store.
  if (dbAvailable()) {
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
      // fall through to in-memory
    }
  }

  // In-memory fallback (local dev without postgres).
  const questions = memoryGetQuestions(trackId);
  return NextResponse.json(
    { questions, source: "local" as const },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/questions
 *
 * Submits a new audience question. Body: { trackId, question, author? }
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

  // Try DB first; fall back to in-memory store.
  if (dbAvailable()) {
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
      // fall through to in-memory
    }
  }

  // In-memory fallback — always works (local dev).
  const q = memoryCreateQuestion(trackId, question, author);
  const result: AudienceQuestion & ApiSuccessResponse = {
    success: true,
    ...q,
  };
  return NextResponse.json(result);
}
