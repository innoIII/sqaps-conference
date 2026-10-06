"use client";

import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import type { Track } from "@/types";

interface TrackItemProps {
  track: Track;
  selected: boolean;
  onSelect: (id: number) => void;
}

/**
 * A single conference track card.
 * Visual states:
 *  - selected  → navy background, white text, gold badge with check, elevation,
 *                gold left accent bar, "استعراض المحتوى" hint with arrow
 *  - unselected → white background, dark text, gold-outlined badge, hover lift
 */
export function TrackItem({ track, selected, onSelect }: TrackItemProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(track.id)}
      aria-pressed={selected}
      aria-label={`اختيار ${track.title}`}
      whileHover={{ y: selected ? 0 : -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "group relative flex w-full flex-col items-start gap-2 overflow-hidden rounded-2xl border p-4 text-right transition-all duration-200 sm:p-5",
        selected
          ? "border-[#D4AF37] bg-[#0B1B3D] text-white shadow-xl shadow-[#0B1B3D]/25"
          : "border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/50 hover:shadow-md",
      ].join(" ")}
    >
      {/* Gold accent bar — appears at top when selected, grows on hover otherwise */}
      <span
        aria-hidden
        className={[
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#D4AF37] to-[#E6C869] transition-transform duration-300",
          selected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        ].join(" ")}
      />

      {/* Badge + active indicator */}
      <div className="flex w-full items-center justify-between">
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all",
            selected
              ? "bg-[#D4AF37] text-[#0B1B3D] shadow-md shadow-[#D4AF37]/30"
              : "border border-[#D4AF37]/40 bg-[#F4ECD0] text-[#0B1B3D] group-hover:bg-[#D4AF37] group-hover:text-[#0B1B3D]",
          ].join(" ")}
        >
          {selected ? <Check className="h-4 w-4" /> : String(track.id).padStart(2, "0")}
        </span>
        {selected ? (
          <motion.span
            layoutId="track-active-dot"
            className="h-2 w-2 rounded-full bg-[#D4AF37]"
          />
        ) : (
          <ArrowLeft
            className="h-4 w-4 -translate-x-1 text-[#D4AF37] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
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
          dir="rtl"
        >
          {track.title}
        </h3>
        <p
          className={[
            "text-xs leading-snug",
            selected ? "text-white/70" : "text-[#6B7280]",
          ].join(" ")}
          dir="rtl"
        >
          {track.subtitle}
        </p>
      </div>

      {/* Hint footer (only on selected) */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#D4AF37]"
          dir="rtl"
        >
          <span className="h-px w-4 bg-[#D4AF37]/50" />
          استعراض المحتوى
        </motion.div>
      )}
    </motion.button>
  );
}
