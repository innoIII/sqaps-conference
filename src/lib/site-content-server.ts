import { db } from "@/lib/db";
import { tracks as staticTracks } from "@/lib/tracks";
import { conferenceInfo, schedule as staticSchedule } from "@/lib/conference-info";

/**
 * Server-side site-content layer.
 *
 * All editable text on the site is stored in the SiteContent table (key/value).
 * This module defines the full key catalog, seeds defaults from the static
 * config files, and provides get/upsert helpers that gracefully degrade when
 * the DB is unavailable (local dev without postgres) → returns static defaults.
 */

/** Flat map of content key → default value (seeded from static config). */
export const CONTENT_DEFAULTS: Record<string, string> = {
  // Conference meta
  "conference.academy": conferenceInfo.academy,
  "conference.edition": conferenceInfo.edition,
  "conference.title": conferenceInfo.title,
  "conference.subtitle": conferenceInfo.subtitle,
  "conference.tagline": conferenceInfo.tagline,
  "conference.dates": conferenceInfo.dates,
  "conference.duration": conferenceInfo.duration,
  "conference.venue": conferenceInfo.venue,
  "conference.city": conferenceInfo.city,
  ...Object.fromEntries(
    conferenceInfo.about.map((p, i) => [`conference.about.${i}`, p]),
  ),
  ...Object.fromEntries(
    conferenceInfo.stats.map((s, i) => [
      `conference.stats.${i}.value`,
      s.value,
    ]),
  ),
  ...Object.fromEntries(
    conferenceInfo.stats.map((s, i) => [
      `conference.stats.${i}.label`,
      s.label,
    ]),
  ),

  // Tracks
  "tracks.count": String(staticTracks.length),
  ...Object.fromEntries(
    staticTracks.flatMap((t) => [
      [`track.${t.id}.title`, t.title],
      [`track.${t.id}.subtitle`, t.subtitle],
      [`track.${t.id}.icon`, t.icon],
    ]),
  ),

  // Schedule
  "schedule.days": String(staticSchedule.length),
  ...Object.fromEntries(
    staticSchedule.flatMap((day, di) => [
      [`schedule.day${di + 1}.label`, day.day],
      [`schedule.day${di + 1}.date`, day.date],
      [`schedule.day${di + 1}.count`, String(day.sessions.length)],
      ...day.sessions.flatMap((s, si) =>
        Object.entries({
          time: s.time,
          title: s.title,
          speaker: s.speaker ?? "",
          type: s.type,
          trackId: s.trackId != null ? String(s.trackId) : "",
        }).map(([k, v]) => [`schedule.day${di + 1}.session.${si}.${k}`, v]),
      ),
    ]),
  ),
};

/** Whether the DB is likely usable (postgres URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * Get all content values as a key→value map. Returns DB values when available,
 * falling back to static defaults for any missing keys.
 */
export async function getAllContent(): Promise<Record<string, string>> {
  const result: Record<string, string> = { ...CONTENT_DEFAULTS };

  if (!dbAvailable()) return result;

  try {
    const rows = await db.siteContent.findMany();
    for (const row of rows) {
      result[row.key] = row.value;
    }
  } catch {
    // DB error → return defaults
  }

  return result;
}

/**
 * Get a single content value by key (falls back to default).
 */
export async function getContent(key: string): Promise<string> {
  const defaults = CONTENT_DEFAULTS;
  if (!dbAvailable()) return defaults[key] ?? "";
  try {
    const row = await db.siteContent.findUnique({ where: { key } });
    return row?.value ?? defaults[key] ?? "";
  } catch {
    return defaults[key] ?? "";
  }
}

/**
 * Upsert a single content key/value.
 */
export async function upsertContent(
  key: string,
  value: string,
): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await db.siteContent.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch {
    // silent
  }
}

/**
 * Bulk upsert multiple content key/values.
 */
export async function upsertManyContent(
  entries: Record<string, string>,
): Promise<void> {
  await Promise.all(
    Object.entries(entries).map(([key, value]) => upsertContent(key, value)),
  );
}
