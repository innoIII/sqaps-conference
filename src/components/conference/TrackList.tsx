"use client";

import { motion } from "framer-motion";
import { tracks } from "@/lib/tracks";
import { TrackItem } from "./TrackItem";

interface TrackListProps {
  selectedId: number;
  onSelect: (id: number) => void;
}

/**
 * Renders the five conference tracks as a responsive grid of selectable cards.
 * Layout adapts: 1 column (mobile) → 2 (sm) → 3 (md) → 5 (xl).
 */
export function TrackList({ selectedId, onSelect }: TrackListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { transition: { staggerChildren: 0.05 } },
        show: { transition: { staggerChildren: 0.05 } },
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
    >
      {tracks.map((track) => (
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
