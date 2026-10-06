import { db } from "@/lib/db";
import { validTrackIds } from "@/lib/tracks";
import type { AudienceQuestion } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** How often to poll the DB for new questions. */
const POLL_INTERVAL_MS = 3_000;
/** Heartbeat cadence. */
const HEARTBEAT_INTERVAL_MS = 15_000;

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseComment(text: string): string {
  return `: ${text}\n\n`;
}

/**
 * GET /api/questions/stream?trackId=N
 *
 * Server-Sent Events stream for a single track's questions. Emits:
 *   - SNAPSHOT on connect (current questions for this track)
 *   - NEW_QUESTION whenever a new question is saved to the DB for this track
 *
 * Only the chair/viewer who has Track N open receives Track N's questions.
 * A question submitted for Track 2 will NOT appear here if trackId=1.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "1", 10);

  if (!validTrackIds.includes(trackId)) {
    return new Response("invalid trackId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  const seen = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // 1. Initial snapshot — current questions for this track.
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
          questions.forEach((q) => seen.add(q.id));
          send(sseEvent("SNAPSHOT", { trackId, questions }));
        } catch {
          send(sseEvent("SNAPSHOT", { trackId, questions: [] }));
        }
      } else {
        send(sseEvent("SNAPSHOT", { trackId, questions: [] }));
      }

      // 2. Heartbeat.
      const heartbeat = setInterval(() => {
        send(sseComment(`heartbeat ${Date.now()}`));
      }, HEARTBEAT_INTERVAL_MS);

      // 3. Poll for new questions for THIS track only.
      const poll = setInterval(async () => {
        if (closed || !dbAvailable()) return;
        try {
          const rows = await db.question.findMany({
            where: { trackId },
            orderBy: { createdAt: "desc" },
            take: 200,
          });
          const fresh = rows.filter((r) => !seen.has(r.id));
          for (const r of fresh) {
            seen.add(r.id);
            const q: AudienceQuestion = {
              id: r.id,
              question: r.question,
              author: r.author ?? undefined,
              trackId: r.trackId,
              createdAt: r.createdAt.toISOString(),
              status: (r.status as "NEW" | "ANSWERED" | "ARCHIVED") ?? "NEW",
            };
            send(sseEvent("NEW_QUESTION", { trackId, question: q }));
          }
        } catch {
          send(sseComment(`poll-error ${Date.now()}`));
        }
      }, POLL_INTERVAL_MS);

      // 4. Clean up on disconnect.
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
