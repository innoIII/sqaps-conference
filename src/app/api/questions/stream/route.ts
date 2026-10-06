import type { AudienceQuestion } from "@/types";
import {
  fetchAudienceQuestions,
  getExternalApiUrl,
  getSessionId,
  normalizeQuestions,
} from "@/lib/audience-questions-server";

/**
 * GET /api/questions/stream?sessionId=conference-2026
 *
 * Server-Sent Events (SSE) endpoint for real-time audience questions.
 *
 * When an external API is configured (AUDIENCE_QUESTIONS_API_URL), this route
 * PROXIES the external SSE stream directly — so a question posted by a student
 * arrives at the browser instantly (no polling latency). It also emits an
 * initial SNAPSHOT from the REST endpoint so the first paint is fast.
 *
 * When no external API is configured, it falls back to polling the sample data
 * every 5 seconds.
 *
 * Client usage:
 *   const es = new EventSource('/api/questions/stream?sessionId=conference-2026');
 *   es.addEventListener('SNAPSHOT', (e) => ...);
 *   es.addEventListener('NEW_QUESTION', (e) => ...);
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Heartbeat cadence to keep the connection alive (fallback mode). */
const HEARTBEAT_INTERVAL_MS = 15_000;
/** Poll interval for the sample-data fallback. */
const POLL_INTERVAL_MS = 5_000;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseComment(text: string): string {
  return `: ${text}\n\n`;
}

/**
 * Parse a single SSE `data:` line payload as JSON, returning the parsed
 * object or null if the line isn't valid JSON.
 */
function parseSseData(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const jsonStr = trimmed.slice(5).trim();
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Client can override sessionId via query; defaults to env-configured value.
  const sessionId =
    searchParams.get("sessionId") ?? getSessionId();

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

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatTimer);
        clearInterval(pollTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Heartbeat (always running, harmless in proxy mode).
      const heartbeatTimer = setInterval(() => {
        send(sseComment(`heartbeat ${Date.now()}`));
      }, HEARTBEAT_INTERVAL_MS);

      // Poll timer (only used in fallback mode).
      const pollTimer = setInterval(async () => {
        if (closed || externalStream) return;
        try {
          const { questions } = await fetchAudienceQuestions();
          const fresh = questions.filter((q) => !seen.has(q.id));
          if (fresh.length > 0) {
            fresh.forEach((q) => {
              seen.add(q.id);
              send(sseEvent("NEW_QUESTION", { sessionId, question: q }));
            });
          }
        } catch {
          send(sseComment(`poll-error ${Date.now()}`));
        }
      }, POLL_INTERVAL_MS);

      // Track ids already sent to avoid duplicates.
      const seen = new Set<string>();
      let externalStream: ReadableStream<Uint8Array> | null = null;

      // 1. Initial snapshot (REST) — fast first paint.
      try {
        const { questions, source } = await fetchAudienceQuestions();
        questions.forEach((q) => seen.add(q.id));
        send(sseEvent("SNAPSHOT", { sessionId, questions, source }));
      } catch {
        send(sseEvent("ERROR", { message: "snapshot failed" }));
      }

      // 2. Try to proxy the external SSE stream directly (true real-time).
      const baseUrl = getExternalApiUrl();
      if (baseUrl) {
        try {
          const streamUrl = new URL(baseUrl);
          // The external API exposes /stream under the same base.
          // baseUrl is .../api/questions → stream is .../api/questions/stream
          streamUrl.pathname = streamUrl.pathname.replace(/\/$/, "") + "/stream";
          streamUrl.searchParams.set("sessionId", sessionId);

          const headers: Record<string, string> = {
            Accept: "text/event-stream",
          };
          const key = process.env.AUDIENCE_QUESTIONS_API_KEY;
          if (key) headers.Authorization = `Bearer ${key}`;

          const upstream = await fetch(streamUrl.toString(), {
            headers,
            cache: "no-store",
            signal: request.signal,
          });

          if (upstream.ok && upstream.body) {
            externalStream = upstream.body as unknown as ReadableStream<Uint8Array>;
            const reader = externalStream.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            // Read the upstream stream chunk by chunk.
            (async () => {
              try {
                while (!closed) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });

                  // Process complete SSE blocks (separated by \n\n).
                  let sepIdx: number;
                  while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
                    const block = buffer.slice(0, sepIdx);
                    buffer = buffer.slice(sepIdx + 2);

                    // Each block may have multiple `data:` lines.
                    const lines = block.split("\n");
                    for (const line of lines) {
                      const payload = parseSseData(line);
                      if (!payload) continue;

                      const type = String(payload.type ?? "").toUpperCase();
                      if (type === "NEW_QUESTION") {
                        const rawQ = payload.question as unknown;
                        const normalized = normalizeQuestions([rawQ]);
                        if (normalized.length > 0) {
                          const q = normalized[0] as AudienceQuestion;
                          if (!seen.has(q.id)) {
                            seen.add(q.id);
                            send(
                              sseEvent("NEW_QUESTION", { sessionId, question: q }),
                            );
                          }
                        }
                      } else if (type === "QUESTION_ANSWERED") {
                        // Forward as an UPDATE event so the client can refresh status.
                        send(sseEvent("QUESTION_ANSWERED", { sessionId, payload }));
                      }
                      // CONNECTED / other events → ignored (heartbeat covers keepalive)
                    }
                  }
                }
              } catch {
                // upstream error → fall back to polling
                externalStream = null;
                send(sseComment(`upstream-ended ${Date.now()}`));
              }
            })();
          }
        } catch {
          // Couldn't connect to external stream → polling fallback stays active.
          send(sseComment(`upstream-connect-failed ${Date.now()}`));
        }
      }

      // 3. Clean up when the client disconnects.
      request.signal.addEventListener("abort", () => {
        cleanup();
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
