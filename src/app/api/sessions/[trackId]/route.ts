import { NextResponse } from "next/server";
import {
  getTrackSession,
  upsertTrackSession,
  upsertResearchPaper,
  deleteResearchPaper,
  isValidTrackId,
} from "@/lib/track-session-server";
import { getTrackById } from "@/lib/tracks";
import { isAdminAuthorized, adminChallenge } from "@/lib/admin-auth";
import { PUBLIC_CACHE } from "@/lib/cache";
import { getMapHalls } from "@/lib/map-halls";
import { db } from "@/lib/db";
import papersManifest from "@/lib/papers-manifest.json";
import type {
  TrackSessionApiResponse,
  TrackSessionInfo,
  ResearchPaper,
  ApiErrorPayload,
  ApiSuccessResponse,
} from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

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
  // PDFs placed in public/papers/track-N/ fill any link the admin left empty.
  const files = new Set<string>(papersManifest);
  for (const p of papers) {
    const paper = `track-${numericId}/paper-${p.slot}.pdf`;
    const cv = `track-${numericId}/cv-${p.slot}.pdf`;
    if (!p.paperUrl && files.has(paper)) p.paperUrl = `/papers/${paper}`;
    if (!p.cvUrl && files.has(cv)) p.cvUrl = `/papers/${cv}`;
  }
  const body: TrackSessionApiResponse = { session, papers };
  return NextResponse.json(body, {
    headers: { "Cache-Control": PUBLIC_CACHE },
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
  // Session data (names, phones, papers) is edited from /admin only.
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return adminChallenge();
  }

  const { trackId } = await params;
  const numericId = Number(trackId);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  let sessionData: Partial<Omit<TrackSessionInfo, "trackId">> | undefined;
  let papersData: Partial<ResearchPaper>[] | undefined;
  let deletedSlots: number[] = [];

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
        chairPhone:
          typeof json.session.chairPhone === "string"
            ? json.session.chairPhone.trim().slice(0, 40)
            : undefined,
        secretaryPhone:
          typeof json.session.secretaryPhone === "string"
            ? json.session.secretaryPhone.trim().slice(0, 40)
            : undefined,
        mapHall:
          typeof json.session.mapHall === "string"
            ? json.session.mapHall.trim().slice(0, 40)
            : undefined,
      };
    }
    if (Array.isArray(json.papers)) {
      papersData = json.papers
        .filter(
          (p: Partial<ResearchPaper>) =>
            typeof p?.slot === "number" && p.slot >= 1,
        )
        .map((p: Partial<ResearchPaper>) => ({
          slot: p.slot as number,
          title: typeof p.title === "string" ? p.title : undefined,
          researcher:
            typeof p.researcher === "string" ? p.researcher : undefined,
          phone: typeof p.phone === "string" ? p.phone.slice(0, 400) : undefined,
          paperUrl: typeof p.paperUrl === "string" ? p.paperUrl : undefined,
          cvUrl: typeof p.cvUrl === "string" ? p.cvUrl : undefined,
        }));
    }
    // Papers to delete (slot numbers).
    deletedSlots = Array.isArray(json.deletedSlots)
      ? json.deletedSlots
          .filter((s: unknown) => typeof s === "number" && s >= 1)
          .map((s: number) => s)
      : [];
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    if (sessionData) {
      // The hall is the session's place: picking one sets the venue to the hall's
      // name (so the main site and the map always agree); "" takes it off the map.
      if (sessionData.mapHall !== undefined) {
        if (!sessionData.mapHall) {
          sessionData.mapHall = null;
        } else {
          const hall = (await getMapHalls()).find((h) => h.id === sessionData!.mapHall);
          if (!hall) {
            const body: ApiErrorPayload = { error: "القاعة غير موجودة في الخريطة" };
            return NextResponse.json(body, { status: 400 });
          }
          sessionData.venue = hall.ar;
        }
      } else if (sessionData.venue !== undefined) {
        // No hall in this save (e.g. an admin page opened before the hall was set):
        // if the session is in a hall, its venue stays the hall's name.
        const row = await db.trackSession.findUnique({ where: { trackId: numericId }, select: { mapHall: true } });
        const hall = row?.mapHall ? (await getMapHalls()).find((h) => h.id === row.mapHall) : undefined;
        if (hall) sessionData.venue = hall.ar;
      }
      await upsertTrackSession(numericId, sessionData);
    }
    // Delete papers marked for deletion.
    for (const slot of deletedSlots) {
      await deleteResearchPaper(numericId, slot);
    }
    // Upsert papers (skip ones marked for deletion).
    if (papersData) {
      for (const p of papersData) {
        if ((p as { _delete?: boolean })._delete) continue;
        await upsertResearchPaper(numericId, p.slot as number, p);
      }
    }
  } catch (e) {
    const body: ApiErrorPayload = {
      error: e instanceof Error ? e.message : "خطأ في قاعدة البيانات",
    };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
