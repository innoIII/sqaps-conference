import { NextResponse } from "next/server";
import type { AudienceQuestionsApiResponse } from "@/types";
import { fetchAudienceQuestions } from "@/lib/audience-questions-server";

/** Ensure this route is always dynamic — it proxies a live external API. */
export const dynamic = "force-dynamic";

/**
 * GET /api/audience-questions
 *
 * Fetches the current snapshot of audience questions (from an external API
 * when configured, otherwise sample data). For real-time updates, clients
 * should connect to the SSE stream at /api/questions/stream.
 */
export async function GET() {
  const { questions, source } = await fetchAudienceQuestions();
  const body: AudienceQuestionsApiResponse = { questions, source };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
