import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContent } from "@/lib/site-content-server";
import { isAdminAuthorized, adminChallenge } from "@/lib/admin-auth";
import { PUBLIC_CACHE } from "@/lib/cache";
import { MAP_CONFIG_KEY as KEY, hallsFromConfig, syncSessionHalls } from "@/lib/map-halls";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MapItem {
  id: string;
  kind: "hall" | "service";
  ar: string;
  en: string;
  room: string | null;
  icon?: string;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Keep only the fields the map understands, with bounded sizes. */
function sanitize(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const cfg = input as Record<string, unknown>;
  if (!Array.isArray(cfg.items) || cfg.items.length > 60) return null;
  const items: MapItem[] = [];
  const seen = new Set<string>();
  for (const raw of cfg.items) {
    if (!raw || typeof raw !== "object") return null;
    const it = raw as Record<string, unknown>;
    const id = str(it.id, 40);
    if (!/^[A-Za-z0-9_-]+$/.test(id) || seen.has(id)) return null;
    seen.add(id);
    items.push({
      id,
      kind: it.kind === "service" ? "service" : "hall",
      ar: str(it.ar, 120) || id,
      en: str(it.en, 120) || id,
      room: str(it.room, 40) || null,
      ...(str(it.icon, 20) ? { icon: str(it.icon, 20) } : {}),
    });
  }
  const event = cfg.event && typeof cfg.event === "object" ? (cfg.event as Record<string, unknown>) : {};
  // GPS calibration: entrances with their real coordinates (see /map → buildGeoFit).
  const rawGeo = cfg.geo && typeof cfg.geo === "object" ? (cfg.geo as { points?: unknown }).points : null;
  const points = (Array.isArray(rawGeo) ? rawGeo : [])
    .slice(0, 8)
    .map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>) : {}))
    .map((p) => ({ ent: str(p.ent, 40), lat: Number(p.lat), lon: Number(p.lon) }))
    .filter((p) => /^[A-Za-z0-9_-]+$/.test(p.ent) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
  return {
    version: 1,
    event: Object.fromEntries(
      ["ar", "sub_ar", "en", "sub_en", "host_ar", "host_en", "dates_ar", "dates_en"]
        .map((k) => [k, str(event[k], 160)])
        .filter(([, v]) => v),
    ),
    defaultStart: str(cfg.defaultStart, 40) || "central",
    items,
    geo: { points },
  };
}

/**
 * GET /api/map-config — public. The organiser configuration of the /map page
 * (null = use the map's built-in defaults) plus every session's hall, so the
 * map can show which session is held where.
 */
export async function GET() {
  try {
    const [row, sessions, count] = await Promise.all([
      db.setting.findUnique({ where: { key: KEY } }),
      db.trackSession.findMany({
        select: { trackId: true, time: true, venue: true, mapHall: true },
        orderBy: { trackId: "asc" },
      }),
      getContent("tracks.count"),
    ]);
    const n = parseInt(count, 10) || 0;
    const visible = sessions.filter((s) => s.trackId <= n);
    const titleRows = await db.siteContent.findMany({
      where: { key: { in: visible.map((s) => `track.${s.trackId}.title`) } },
    });
    const titleOf = new Map(titleRows.map((r) => [r.key, r.value]));
    const titles = visible.map((s) => titleOf.get(`track.${s.trackId}.title`));
    const config = row ? (JSON.parse(row.value) as { items: MapItem[] }) : null;
    const halls = hallsFromConfig(config);
    return NextResponse.json(
      {
        config,
        halls,
        sessions: visible.map((s, i) => ({
          trackId: s.trackId,
          title: titles[i] || `الجلسة ${s.trackId}`,
          time: s.time ?? "",
          venue: s.venue ?? "",
          hall: s.mapHall ?? null,
        })),
      },
      { headers: { "Cache-Control": PUBLIC_CACHE } },
    );
  } catch {
    return NextResponse.json(
      { config: null, halls: [], sessions: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * PUT /api/map-config — admin only. Body: the organiser configuration, plus an
 * optional `assignments` map { trackId: hallId | null } from the map's settings
 * ("which sessions are held in this hall"). Saving also brings every session's
 * place in line with the halls (renamed hall → new venue name; deleted hall →
 * session taken off the map) — see src/lib/map-halls.ts.
 */
export async function PUT(request: Request) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return adminChallenge();
  }
  let cfg: Record<string, unknown> | null;
  const assignments: Record<number, string | null> = {};
  try {
    const body = await request.json();
    cfg = sanitize(body);
    const raw = body && typeof body === "object" ? (body as Record<string, unknown>).assignments : null;
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const trackId = Number(k);
        if (!Number.isInteger(trackId) || trackId < 1 || trackId > 50) continue;
        assignments[trackId] = typeof v === "string" && v ? v.slice(0, 40) : null;
      }
    }
  } catch {
    cfg = null;
  }
  if (!cfg) {
    const body: ApiErrorPayload = { error: "إعدادات الخريطة غير صالحة" };
    return NextResponse.json(body, { status: 400 });
  }
  const value = JSON.stringify(cfg);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  const changed = await syncSessionHalls(hallsFromConfig(cfg as { items: MapItem[] }), assignments);
  return NextResponse.json({ success: true, sessionsUpdated: changed });
}
