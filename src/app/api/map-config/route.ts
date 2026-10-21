import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContent } from "@/lib/site-content-server";
import { isAdminAuthorized, adminChallenge } from "@/lib/admin-auth";
import { PUBLIC_CACHE } from "@/lib/cache";
import type { ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Settings key holding the /map organiser configuration (halls, services, start point). */
const KEY = "map.config";

interface MapItem {
  id: string;
  kind: "hall" | "service";
  ar: string;
  en: string;
  room: string | null;
  icon?: string;
}

/** The map's built-in halls (public/map/index.html DEFAULT_CONFIG) — used until the admin saves a layout. */
const DEFAULT_HALLS = [
  { id: "lh1", ar: "قاعة المحاضرات (١)" },
  { id: "lh2", ar: "قاعة المحاضرات (٢)" },
  { id: "lh3", ar: "قاعة المحاضرات (٣)" },
  { id: "lh4", ar: "قاعة المحاضرات (٤)" },
];

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
  return {
    version: 1,
    event: Object.fromEntries(
      ["ar", "sub_ar", "en", "sub_en", "host_ar", "host_en", "dates_ar", "dates_en"]
        .map((k) => [k, str(event[k], 160)])
        .filter(([, v]) => v),
    ),
    defaultStart: str(cfg.defaultStart, 40) || "central",
    items,
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
    const halls = config
      ? config.items.filter((i) => i.kind === "hall").map((i) => ({ id: i.id, ar: i.ar, placed: !!i.room }))
      : DEFAULT_HALLS.map((h) => ({ ...h, placed: true }));
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

/** PUT /api/map-config — admin only. Body: the organiser configuration. */
export async function PUT(request: Request) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return adminChallenge();
  }
  let cfg: Record<string, unknown> | null;
  try {
    cfg = sanitize(await request.json());
  } catch {
    cfg = null;
  }
  if (!cfg) {
    const body: ApiErrorPayload = { error: "إعدادات الخريطة غير صالحة" };
    return NextResponse.json(body, { status: 400 });
  }
  const value = JSON.stringify(cfg);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
