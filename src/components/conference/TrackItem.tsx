"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Track } from "@/types";

interface TrackItemProps {
  track: Track;
  selected: boolean;
  onSelect: (id: number) => void;
}

/**
 * A single conference track card.
 * Visual states:
 *  - selected  → navy background, white text, gold badge, elevated shadow
 *  - unselected → white background, dark text, gold-outlined badge, hover lift
 */
export function TrackItem({ track, selected, onSelect }: TrackItemProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(track.id)}
      aria-pressed={selected}
      aria-label={`اختيار ${track.title}`}
      whileHover={{ y: selected ? 0 : -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "group relative flex w-full flex-col items-start gap-2 rounded-2xl border p-4 text-right transition-colors duration-200 sm:p-5",
        selected
          ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-xl shadow-[#0B1B3D]/20"
          : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/50 hover:shadow-md",
      ].join(" ")}
    >
      {/* Badge */}
      <div className="flex w-full items-center justify-between">
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
            selected
              ? "bg-[#D4AF37] text-[#0B1B3D]"
              : "border border-[#D4AF37]/40 bg-[#F4ECD0] text-[#0B1B3D] group-hover:bg-[#D4AF37] group-hover:text-[#0B1B3D]",
          ].join(" ")}
        >
          {selected ? <Check className="h-4 w-4" /> : String(track.id).padStart(2, "0")}
        </span>
        {selected && (
          <motion.span
            layoutId="track-active-dot"
            className="h-2 w-2 rounded-full bg-[#D4AF37]"
          />
        )}
      </div>

      {/* Title + subtitle */}
      <div className="mt-1 space-y-1">
        <h3
          className={[
            "text-sm font-bold leading-snug sm:text-base",
            selected ? "text-white" : "text-[#0B1B3D]",
          ].join(" ")}
        >
          {track.title}
        </h3>
        <p
          className={[
            "text-xs leading-snug",
            selected ? "text-white/70" : "text-[#6B7280]",
          ].join(" ")}
        >
          {track.subtitle}
        </p>
      </div>
    </motion.button>
  );
}
