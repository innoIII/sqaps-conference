"use client";

import { motion } from "framer-motion";
import { tracks as staticTracks } from "@/lib/tracks";
import type { Track } from "@/types";
import { TrackItem } from "./TrackItem";
import { useSiteContentValue } from "./SiteContentProvider";

interface TrackListProps {
  selectedId: number;
  onSelect: (id: number) => void;
}

/**
 * Renders the conference tracks as a responsive grid of selectable cards.
 *
 * Reads the dynamic track count from the site content (DB-backed) so tracks
 * added/removed in the admin panel appear here automatically.
 */
export function TrackList({ selectedId, onSelect }: TrackListProps) {
  const { get } = useSiteContentValue();

  // Build the dynamic track list from the content map.
  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", String(staticTracks.length)), 10) ||
      staticTracks.length,
  );

  const dynamicTracks: Track[] = Array.from({ length: trackCount }, (_, i) => {
    const id = i + 1;
    const staticTrack = staticTracks.find((t) => t.id === id);
    return {
      id,
      title: get(`track.${id}.title`, staticTrack?.title ?? `المحور ${id}`),
      subtitle: get(`track.${id}.subtitle`, staticTrack?.subtitle ?? ""),
      folder: staticTrack?.folder ?? `track-${id}`,
      icon: (get(`track.${id}.icon`, staticTrack?.icon ?? "law") as Track["icon"]) ?? "law",
      sessionId: staticTrack?.sessionId ?? `track-${id}`,
    };
  });

  // Responsive grid columns based on track count.
  const gridCols =
    trackCount <= 3
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      : trackCount <= 5
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { transition: { staggerChildren: 0.05 } },
        show: { transition: { staggerChildren: 0.05 } },
      }}
      className={`grid ${gridCols} gap-3`}
    >
      {dynamicTracks.map((track) => (
        <motion.div
          key={track.id}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <TrackItem
            track={track}
            selected={selectedId === track.id}
            onSelect={onSelect}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
