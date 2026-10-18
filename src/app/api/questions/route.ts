import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validTrackIds } from "@/lib/tracks";
import {
  memoryCreateQuestion,
  memoryGetQuestions,
  memoryDeleteQuestion,
  memoryDeleteAllForTrack,
  memoryDeleteAll,
} from "@/lib/questions-memory";
import type { AudienceQuestion, ApiErrorPayload, ApiSuccessResponse } from "@/types";
import { isAdminAuthorized, adminChallenge } from "@/lib/admin-auth";

/** Limits for public submissions. */
const MAX_QUESTION = 1000;
const MAX_AUTHOR = 80;
const RATE_LIMIT = 5; // questions…
const RATE_WINDOW_MS = 60_000; // …per minute, per client IP

/**
 * Best-effort per-IP rate limit. Kept in memory, so each server instance counts
 * on its own — enough to stop a script flooding the form, not a hard guarantee.
 */
const recent = new Map<string, number[]>();
function rateLimited(request: Request): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear(); // keep memory bounded
  return false;
}

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
        paperSlot: r.paperSlot ?? undefined,
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
  if (rateLimited(request)) {
    const body: ApiErrorPayload = { error: "أرسلت عدة أسئلة خلال وقت قصير، انتظر دقيقة ثم حاول مرة أخرى" };
    return NextResponse.json(body, { status: 429 });
  }

  let trackId: number;
  let question: string;
  let author: string | undefined;
  let paperSlot: number | undefined;

  try {
    const json = await request.json();
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    question = String(json.question ?? "").trim();
    author = json.author ? String(json.author).trim() : undefined;
    paperSlot = json.paperSlot ? parseInt(String(json.paperSlot), 10) : undefined;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!validTrackIds.includes(trackId)) {
    const body: ApiErrorPayload = { error: "رقم الجلسة غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!question) {
    const body: ApiErrorPayload = { error: "السؤال فارغ" };
    return NextResponse.json(body, { status: 400 });
  }

  if (question.length > MAX_QUESTION) {
    const body: ApiErrorPayload = { error: `السؤال طويل جداً (الحد ${MAX_QUESTION} حرف)` };
    return NextResponse.json(body, { status: 400 });
  }
  if (author && author.length > MAX_AUTHOR) author = author.slice(0, MAX_AUTHOR);

  // Try DB first; fall back to in-memory store.
  if (dbAvailable()) {
    try {
      const row = await db.question.create({
        data: { trackId, question, author, paperSlot, status: "NEW" },
      });
      const result: AudienceQuestion & ApiSuccessResponse = {
        success: true,
        id: row.id,
        question: row.question,
        author: row.author ?? undefined,
        trackId: row.trackId,
        paperSlot: row.paperSlot ?? undefined,
        createdAt: row.createdAt.toISOString(),
        status: "NEW",
      };
      return NextResponse.json(result);
    } catch {
      // fall through to in-memory
    }
  }

  // In-memory fallback — always works (local dev).
  const q = memoryCreateQuestion(trackId, question, author, paperSlot);
  const result: AudienceQuestion & ApiSuccessResponse = {
    success: true,
    ...q,
  };
  return NextResponse.json(result);
}

/**
 * DELETE /api/questions?id=X          → delete a single question
 * DELETE /api/questions?trackId=N     → delete all questions for a track
 * DELETE /api/questions?all=true      → delete ALL questions
 *
 * All DELETE variants require admin credentials (Basic Auth).
 */
export async function DELETE(request: Request) {
  // Deleting questions is a moderator action: admin credentials required. The
  // challenge makes the browser ask once for the admin username/password.
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return adminChallenge("حذف الأسئلة يتطلب تسجيل الدخول بحساب الإدارة");
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const trackIdRaw = searchParams.get("trackId");
  const all = searchParams.get("all") === "true";

  // Delete ALL questions (used by admin "clear all").
  if (all) {
    if (dbAvailable()) {
      try {
        await db.question.deleteMany({});
      } catch {
        // fall through to memory
      }
    }
    memoryDeleteAll();
    return NextResponse.json({ success: true, deleted: "all" });
  }

  // Delete all questions for a specific track.
  if (trackIdRaw) {
    const trackId = parseInt(trackIdRaw, 10);
    if (!validTrackIds.includes(trackId)) {
      const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
      return NextResponse.json(body, { status: 400 });
    }
    let deleted = 0;
    if (dbAvailable()) {
      try {
        const r = await db.question.deleteMany({ where: { trackId } });
        deleted = r.count;
      } catch {
        // fall through to memory
      }
    }
    deleted += memoryDeleteAllForTrack(trackId);
    return NextResponse.json({ success: true, deleted });
  }

  // Delete a single question by id.
  if (id) {
    if (dbAvailable()) {
      try {
        await db.question.delete({ where: { id } });
        return NextResponse.json({ success: true, deleted: 1 });
      } catch {
        // not in DB or DB error → try memory
      }
    }
    const ok = memoryDeleteQuestion(id);
    return NextResponse.json({ success: true, deleted: ok ? 1 : 0 });
  }

  const body: ApiErrorPayload = { error: "حدد معرّف السؤال أو المحور" };
  return NextResponse.json(body, { status: 400 });
}
