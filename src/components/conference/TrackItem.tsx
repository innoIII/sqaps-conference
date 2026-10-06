"use client";

import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import type { Track } from "@/types";
import { TrackIcon, getTrackGradient } from "./TrackIcon";
import { useSiteContentValue } from "./SiteContentProvider";

interface TrackItemProps {
  track: Track;
  selected: boolean;
  onSelect: (id: number) => void;
}

/**
 * A single conference track card.
 * Visual states:
 *  - selected  → navy background, white text, themed gradient icon badge,
 *                gold accent bar, "استعراض المحتوى" hint with arrow
 *  - unselected → white background, dark text, themed gradient icon badge,
 *                hover lift
 *
 * Each track shows a context-aware icon (law/security/technology/governance/media)
 * instead of a plain number — making the grid scannable and meaningful.
 */
export function TrackItem({ track, selected, onSelect }: TrackItemProps) {
  const { get } = useSiteContentValue();
  const gradient = getTrackGradient(track.icon);
  const title = get(`track.${track.id}.title`, track.title);
  const subtitle = get(`track.${track.id}.subtitle`, track.subtitle);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(track.id)}
      aria-pressed={selected}
      aria-label={`اختيار ${title}`}
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
      {/* Themed gradient backdrop — subtle, only on hover/selected */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity duration-300",
          gradient,
          selected ? "opacity-20" : "opacity-0 group-hover:opacity-10",
        ].join(" ")}
      />

      {/* Gold accent bar — appears at top when selected, grows on hover otherwise */}
      <span
        aria-hidden
        className={[
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#D4AF37] to-[#E6C869] transition-transform duration-300",
          selected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        ].join(" ")}
      />

      {/* Themed icon badge + track number + active indicator */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Themed gradient icon badge */}
          <span
            className={[
              "relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-all duration-200 group-hover:scale-105",
              gradient,
            ].join(" ")}
          >
            <TrackIcon
              icon={track.icon}
              iconClassName="h-5 w-5 text-white"
            />
            {/* Track number chip */}
            <span className="absolute -bottom-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D4AF37] px-1 text-[10px] font-bold text-[#0B1B3D] shadow-sm">
              {String(track.id).padStart(2, "0")}
            </span>
            {selected && (
              <motion.span
                layoutId="track-selected-ring"
                className="absolute inset-0 rounded-xl ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0B1B3D]"
              />
            )}
          </span>
          {/* Selected check indicator */}
          {selected && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-[#0B1B3D] shadow-md"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </div>

        {!selected && (
          <ArrowLeft
            className="h-4 w-4 -translate-x-1 text-[#D4AF37] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        )}
      </div>

      {/* Title + subtitle */}
      <div className="mt-2 space-y-1">
        <h3
          className={[
            "text-sm font-bold leading-snug sm:text-base",
            selected ? "text-white" : "text-[#0B1B3D]",
          ].join(" ")}
          dir="rtl"
        >
          {title}
        </h3>
        <p
          className={[
            "text-xs leading-snug",
            selected ? "text-white/70" : "text-[#6B7280]",
          ].join(" ")}
          dir="rtl"
        >
          {subtitle}
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
