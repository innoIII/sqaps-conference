import type { Track } from "@/types";

/**
 * Central track configuration.
 *
 * This is the single source of truth for conference tracks. Add a new entry
 * here and create the matching `public/content/<folder>` directory to make a
 * new track available to the portal — no component changes required.
 */
export const tracks: Track[] = [
  {
    id: 1,
    title: "المحور الأول: القانون والتشريع",
    subtitle: "الأطر والقوانين والشرعية",
    folder: "track-1",
    icon: "law",
  },
  {
    id: 2,
    title: "المحور الثاني: الأمن واستشراف المستقبل",
    subtitle: "الاستراتيجيات الأمنية",
    folder: "track-2",
    icon: "security",
  },
  {
    id: 3,
    title: "المحور الثالث: التقنية والابتكار",
    subtitle: "الحلول الرقمية الحديثة",
    folder: "track-3",
    icon: "technology",
  },
  {
    id: 4,
    title: "المحور الرابع: الحوكمة والإدارة",
    subtitle: "الإدارة المؤسسية الرشيدة",
    folder: "track-4",
    icon: "governance",
  },
  {
    id: 5,
    title: "المحور الخامس: المجتمع والإعلام",
    subtitle: "التوعية والوقاية",
    folder: "track-5",
    icon: "media",
  },
];

/** Allowed track IDs — used for strict validation in API + client. */
export const validTrackIds = tracks.map((t) => t.id);

/** Look up a track by its numeric id. */
export function getTrackById(id: number): Track | undefined {
  return tracks.find((t) => t.id === id);
}

/** The track that should be selected when the portal first loads. */
export const DEFAULT_TRACK_ID = 1;
