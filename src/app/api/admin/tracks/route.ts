import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAllContent,
  upsertContent,
} from "@/lib/site-content-server";
import type { ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";

/** Whether the DB is likely usable (postgres URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * POST /api/admin/tracks
 *
 * Adds a new track at the end of the current track list.
 *  - Increments `tracks.count`.
 *  - Sets default title/subtitle for the new track (`track.N.title`, `track.N.subtitle`).
 *  - Creates an empty TrackSession row for the new trackId.
 *
 * Returns the new track id + count.
 */
export async function POST() {
  // Read current content to find the current count.
  const content = await getAllContent();
  const currentCount = Math.max(
    0,
    parseInt(content["tracks.count"] ?? "0", 10) || 0,
  );
  const newId = currentCount + 1;

  // Default values for the new track.
  await upsertContent("tracks.count", String(newId));
  await upsertContent(`track.${newId}.title`, `المحور ${newId}`);
  await upsertContent(`track.${newId}.subtitle`, "");

  // Create an empty TrackSession row so the chair can edit it immediately.
  if (dbAvailable()) {
    try {
      await db.trackSession.upsert({
        where: { trackId: newId },
        create: { trackId: newId },
        update: {},
      });
    } catch {
      // Non-fatal — the row will be created on first PUT to /api/sessions.
    }
  }

  const body: ApiSuccessResponse & { trackId: number; count: number } = {
    success: true,
    trackId: newId,
    count: newId,
  };
  return NextResponse.json(body);
}

/**
 * GET /api/admin/tracks
 *
 * Returns the current track list (ids + titles) as derived from `tracks.count`
 * and `track.N.title`. Useful for admin UIs that need to render the dynamic
 * list of tracks.
 */
export async function GET() {
  const content = await getAllContent();
  const count = Math.max(
    0,
    parseInt(content["tracks.count"] ?? "0", 10) || 0,
  );
  const tracks = Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    return {
      id,
      title: content[`track.${id}.title`] ?? `المحور ${id}`,
      subtitle: content[`track.${id}.subtitle`] ?? "",
    };
  });
  return NextResponse.json({ count, tracks });
}

/** Unused — silence TypeScript for the unused `ApiErrorPayload` import type. */
export type _Unused = ApiErrorPayload;
