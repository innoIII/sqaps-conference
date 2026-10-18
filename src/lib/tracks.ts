import type { Track } from "@/types";

/**
 * Central track configuration (static defaults).
 *
 * The actual track count + titles are dynamic (stored in the DB via
 * SiteContent). This file provides the static fallback defaults.
 *
 * The `validTrackIds` and `getTrackById` functions accept ANY positive
 * integer — the dynamic track count is enforced by the API routes which
 * read `tracks.count` from the content map.
 */
export const tracks: Track[] = [
  {
    id: 1,
    title: "الجلسة الأولى: جلسة الخبراء",
    subtitle: "",
    folder: "track-1",
    icon: "law",
    sessionId: "track-1",
  },
  {
    id: 2,
    title: "الجلسة الثانية: الأطر التشريعية والقانونية لمواجهة الجرائم العابرة للحدود",
    subtitle: "",
    folder: "track-2",
    icon: "security",
    sessionId: "track-2",
  },
  {
    id: 3,
    title: "الجلسة الثالثة: العدالة الجنائية والجرائم المالية والتعاون الأمني الدولي",
    subtitle: "",
    folder: "track-3",
    icon: "technology",
    sessionId: "track-3",
  },
  {
    id: 4,
    title: "الجلسة الرابعة: الاستراتيجيات الأمنية وإدارة الحدود والتعاون الدولي",
    subtitle: "",
    folder: "track-4",
    icon: "governance",
    sessionId: "track-4",
  },
  {
    id: 5,
    title: "الجلسة الخامسة: الذكاء الاصطناعي والتقنيات الحديثة في المجال الأمني",
    subtitle: "",
    folder: "track-5",
    icon: "media",
    sessionId: "track-5",
  },
];

/**
 * Accept ANY positive integer as a valid track id.
 * The actual track count is enforced dynamically by reading `tracks.count`
 * from the SiteContent (DB). This allows the admin to add tracks 6, 7, 8...
 * without code changes.
 */
export const validTrackIds: number[] = Array.from({ length: 50 }, (_, i) => i + 1);

/** Check if a track id is valid (any positive integer 1..50). */
export function isValidTrackId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 50;
}

/** Look up a track by its numeric id (returns static defaults for 1..5). */
export function getTrackById(id: number): Track | undefined {
  const staticTrack = tracks.find((t) => t.id === id);
  if (staticTrack) return staticTrack;
  // For dynamic tracks (6+), return a basic template.
  if (id >= 1 && id <= 50) {
    return {
      id,
      title: `الجلسة ${id}`,
      subtitle: "",
      folder: `track-${id}`,
      icon: "law",
      sessionId: `track-${id}`,
    };
  }
  return undefined;
}

/** The track that should be selected when the portal first loads. */
export const DEFAULT_TRACK_ID = 1;
