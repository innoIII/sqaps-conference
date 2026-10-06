import { NextResponse } from "next/server";
import {
  getTrackSession,
  upsertTrackSession,
  upsertResearchPaper,
  isValidTrackId,
} from "@/lib/track-session-server";
import { getTrackById } from "@/lib/tracks";
import type {
  TrackSessionApiResponse,
  TrackSessionInfo,
  ResearchPaper,
  ApiErrorPayload,
  ApiSuccessResponse,
} from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[trackId]
 *
 * Returns the session header info (time / venue / chair / secretary) and the
 * 5 research-paper slots for a track. Public — shown to all visitors.
 *
 * The chair's private report is NOT included here (it's only available via
 * /api/sessions/[trackId]/report, used by the admin iPad interface).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await params;
  const numericId = Number(trackId);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const track = getTrackById(numericId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 404 });
  }

  const { session, papers } = await getTrackSession(numericId);
  const body: TrackSessionApiResponse = { session, papers };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT /api/sessions/[trackId]
 *
 * Updates the session header info and/or research papers for a track.
 * Used by the admin iPad interface.
 *
 * Body shape:
 *   { session?: Partial<TrackSessionInfo>, papers?: Partial<ResearchPaper>[] }
 *
 * `papers` is an array of { slot, title?, researcher?, paperUrl?, cvUrl? } —
 * only the slots provided are upserted (others stay unchanged).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await params;
  const numericId = Number(trackId);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  let sessionData: Partial<Omit<TrackSessionInfo, "trackId">> | undefined;
  let papersData: Partial<ResearchPaper>[] | undefined;

  try {
    const json = await request.json();
    if (json.session && typeof json.session === "object") {
      sessionData = {
        time: typeof json.session.time === "string" ? json.session.time : undefined,
        venue:
          typeof json.session.venue === "string" ? json.session.venue : undefined,
        chair:
          typeof json.session.chair === "string" ? json.session.chair : undefined,
        secretary:
          typeof json.session.secretary === "string"
            ? json.session.secretary
            : undefined,
      };
    }
    if (Array.isArray(json.papers)) {
      papersData = json.papers
        .filter(
          (p: Partial<ResearchPaper>) =>
            typeof p?.slot === "number" && p.slot >= 1 && p.slot <= 5,
        )
        .map((p: Partial<ResearchPaper>) => ({
          slot: p.slot as number,
          title: typeof p.title === "string" ? p.title : undefined,
          researcher:
            typeof p.researcher === "string" ? p.researcher : undefined,
          paperUrl: typeof p.paperUrl === "string" ? p.paperUrl : undefined,
          cvUrl: typeof p.cvUrl === "string" ? p.cvUrl : undefined,
        }));
    }
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (sessionData) {
    await upsertTrackSession(numericId, sessionData);
  }
  if (papersData) {
    for (const p of papersData) {
      await upsertResearchPaper(numericId, p.slot as number, p);
    }
  }

  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
