import { db } from "@/lib/db";

/**
 * Halls of the /map page and the single source of truth for "where is each session".
 *
 * A session's place is `track_sessions.mapHall` (a hall id from the map). Its
 * `venue` text — shown on the main site — always follows the hall's name, so
 * changing the hall from the session data, the admin map tab, or the map's own
 * settings moves the session everywhere at once.
 */

/** Settings key holding the /map organiser configuration (halls, services, start point). */
export const MAP_CONFIG_KEY = "map.config";

export interface MapHall {
  id: string;
  ar: string;
  /** Whether the hall has been placed on a room of the map. */
  placed: boolean;
}

/** The map's built-in halls (public/map/index.html DEFAULT_CONFIG) — used until the admin saves a layout. */
export const DEFAULT_HALLS: MapHall[] = [
  { id: "lh1", ar: "قاعة المحاضرات (١)", placed: true },
  { id: "lh2", ar: "قاعة المحاضرات (٢)", placed: true },
  { id: "lh3", ar: "قاعة المحاضرات (٣)", placed: true },
  { id: "lh4", ar: "قاعة المحاضرات (٤)", placed: true },
];

interface StoredItem {
  id: string;
  kind: string;
  ar: string;
  room: string | null;
}

/** Halls from the saved map layout (or the built-in ones). */
export function hallsFromConfig(config: { items?: StoredItem[] } | null): MapHall[] {
  if (!config?.items) return DEFAULT_HALLS;
  return config.items.filter((i) => i.kind === "hall").map((i) => ({ id: i.id, ar: i.ar, placed: !!i.room }));
}

export async function getMapHalls(): Promise<MapHall[]> {
  const row = await db.setting.findUnique({ where: { key: MAP_CONFIG_KEY } });
  return hallsFromConfig(row ? JSON.parse(row.value) : null);
}

/**
 * Bring every session in line with the halls:
 *   - `assignments` (trackId → hall id, or null to clear) are applied first;
 *   - a session in a hall gets that hall's name as its venue (so renames follow);
 *   - a session whose hall no longer exists is taken off the map (its venue text stays).
 * One short transaction; returns how many sessions changed.
 */
export async function syncSessionHalls(
  halls: MapHall[],
  assignments: Record<number, string | null> = {},
): Promise<number> {
  const name = new Map(halls.map((h) => [h.id, h.ar]));
  const sessions = await db.trackSession.findMany({ select: { trackId: true, mapHall: true, venue: true } });
  const updates: ReturnType<typeof db.trackSession.update>[] = [];
  for (const s of sessions) {
    const assigned = Object.prototype.hasOwnProperty.call(assignments, s.trackId) ? assignments[s.trackId] : s.mapHall;
    const hall = assigned && name.has(assigned) ? assigned : null;
    const venue = hall ? name.get(hall)! : s.venue;
    if (hall !== s.mapHall || venue !== s.venue) {
      updates.push(db.trackSession.update({ where: { trackId: s.trackId }, data: { mapHall: hall, venue } }));
    }
  }
  if (updates.length) await db.$transaction(updates);
  return updates.length;
}
