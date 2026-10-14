import { NextResponse } from "next/server";
import type { AudienceQuestionsApiResponse } from "@/types";
import { fetchAudienceQuestions } from "@/lib/audience-questions-server";

/** Ensure this route is always dynamic — it proxies a live external API. */
export const dynamic = "force-dynamic";

/**
 * GET /api/audience-questions?sessionId=<id>
 *
 * Fetches the current snapshot of audience questions for a given session
 * (track) from the external API when configured, otherwise sample data.
 * Each track passes its own sessionId so only that track's questions show.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;

  const { questions, source } = await fetchAudienceQuestions(sessionId);
  const body: AudienceQuestionsApiResponse = { questions, source };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
