import { NextResponse } from "next/server";
import {
  getAllContent,
  upsertManyContent,
  CONTENT_DEFAULTS,
} from "@/lib/site-content-server";
import type { ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/site-content
 *
 * Returns all editable site content as a flat key→value map. Values come from
 * the DB when available, falling back to static defaults for any missing keys.
 *
 * Public — the public site reads this to render every word (title, subtitle,
 * about, track names, schedule, etc.).
 */
export async function GET() {
  const content = await getAllContent();
  return NextResponse.json(content, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT /api/site-content
 *
 * Bulk-updates content. Body: a flat { key: value } object. Only the provided
 * keys are upserted; others stay unchanged.
 *
 * Admin-only (used by /admin → "محتوى الموقع" tab).
 */
export async function PUT(request: Request) {
  let entries: Record<string, string>;
  try {
    const json = await request.json();
    if (typeof json !== "object" || json === null) throw new Error("bad");
    entries = {} as Record<string, string>;
    for (const [key, value] of Object.entries(json)) {
      if (typeof value !== "string") continue;
      const isKnown = key in CONTENT_DEFAULTS;
      const isDynamicSchedule =
        /^schedule\.day\d+\.(label|date|count|session\.\d+\.(time|title|speaker|type|trackId))$/.test(key);
      const isDynamicTrack =
        /^track\.\d+\.(title|subtitle|icon)$/.test(key) || key === "tracks.count";
      if (isKnown || isDynamicSchedule || isDynamicTrack) {
        entries[key] = value;
      }
    }
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  await upsertManyContent(entries);
  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
