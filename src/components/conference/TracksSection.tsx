"use client";

import { Layers3 } from "lucide-react";
import { TrackList } from "./TrackList";

interface TracksSectionProps {
  selectedId: number;
  onSelect: (id: number) => void;
}

/**
 * The white "محاور المؤتمر" card that wraps the track list.
 * Purely presentational container.
 */
export function TracksSection({ selectedId, onSelect }: TracksSectionProps) {
  return (
    <section
      aria-labelledby="tracks-heading"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="rounded-2xl border border-[#E2E5EC] bg-white p-5 shadow-lg shadow-[#0B1B3D]/5 sm:p-7">
        <div className="mb-5 flex items-center gap-3 border-b border-[#F5F6F8] pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37]">
            <Layers3 className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2
              id="tracks-heading"
              className="text-lg font-bold text-[#0B1B3D] sm:text-xl"
            >
              محاور المؤتمر
            </h2>
            <p className="text-xs text-[#6B7280] sm:text-sm">
              اختر أحد المحاور لاستعراض ملفاته وأوراقه العلمية
            </p>
          </div>
          <span className="hidden rounded-full bg-[#F4ECD0] px-3 py-1 text-xs font-bold text-[#0B1B3D] sm:inline">
            ٥ محاور
          </span>
        </div>

        <TrackList selectedId={selectedId} onSelect={onSelect} />
      </div>
    </section>
  );
}
