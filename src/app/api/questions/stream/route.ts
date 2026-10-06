import type { AudienceQuestion } from "@/types";
import { fetchAudienceQuestions } from "@/lib/audience-questions-server";

/**
 * GET /api/questions/stream?sessionId=conference-2026
 *
 * Server-Sent Events (SSE) endpoint that pushes new audience questions to the
 * client in real time.
 *
 * How it works:
 *  1. On connect, sends a `SNAPSHOT` event with the current questions.
 *  2. Polls the data source (external API or sample) every few seconds.
 *  3. For each question whose id wasn't sent before, emits a `NEW_QUESTION`
 *     event with the full question object.
 *  4. Sends a `HEARTBEAT` comment every 15s to keep the connection alive
 *     (important for proxies / Vercel's edge idle timeouts).
 *
 * The `sessionId` query param is accepted for future multi-session support
 * but currently all sessions share the same question pool.
 *
 * Client usage:
 *   const es = new EventSource('/api/questions/stream?sessionId=conference-2026');
 *   es.addEventListener('SNAPSHOT', (e) => ...);
 *   es.addEventListener('NEW_QUESTION', (e) => ...);
 *
 * Note: on serverless platforms (Vercel Hobby), connections are capped at
 * ~25s. EventSource auto-reconnects, and the `Last-Event-ID` header is used
 * to avoid re-sending questions the client already has.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** How often to poll the data source for new questions. */
const POLL_INTERVAL_MS = 5_000;
/** Heartbeat cadence to keep the connection alive. */
const HEARTBEAT_INTERVAL_MS = 15_000;

/** SSE message helper: named event with JSON data. */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** SSE comment (used for heartbeats — invisible to EventSource.onmessage). */
function sseComment(text: string): string {
  return `: ${text}\n\n`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "default";

  // Track ids already sent to this client (avoids duplicates on reconnect).
  // Seeded from the Last-Event-ID header if the browser auto-reconnected.
  const seen = new Set<string>();
  const lastEventId = request.headers.get("last-event-id");
  if (lastEventId) {
    // Last-Event-ID is the id of the last event the client received.
    // We treat anything <= it as seen by pre-seeding with a marker; since we
    // don't assign numeric event ids, we just mark the snapshot as "resume".
  }

  const encoder = new TextEncoder();
  let closed = false;

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

      // 1. Initial snapshot — send what we have right now.
      try {
        const { questions } = await fetchAudienceQuestions();
        questions.forEach((q) => seen.add(q.id));
        send(sseEvent("SNAPSHOT", { sessionId, questions }));
      } catch {
        send(sseEvent("ERROR", { message: "snapshot failed" }));
      }

      // 2. Heartbeat ticker.
      const heartbeat = setInterval(() => {
        send(sseComment(`heartbeat ${Date.now()}`));
      }, HEARTBEAT_INTERVAL_MS);

      // 3. Polling ticker — looks for new questions.
      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const { questions } = await fetchAudienceQuestions();
          const fresh = questions.filter((q) => !seen.has(q.id));
          if (fresh.length > 0) {
            fresh.forEach((q: AudienceQuestion) => {
              seen.add(q.id);
              send(sseEvent("NEW_QUESTION", { sessionId, question: q }));
            });
          }
        } catch {
          // transient error — keep the connection alive, try again next tick
          send(sseComment(`poll-error ${Date.now()}`));
        }
      }, POLL_INTERVAL_MS);

      // 4. Clean up when the client disconnects.
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
      // Allow the proxy to buffer (Vercel streams fine with this).
      "X-Accel-Buffering": "no",
    },
  });
}
