"use client";

import { motion } from "framer-motion";
import { Users, ChevronLeft } from "lucide-react";
import { speakers } from "@/lib/conference-info";
import { getTrackById } from "@/lib/tracks";

/** Avatar gradient palette keyed off the speaker id hash for variety. */
const AVATAR_GRADIENTS = [
  "from-[#0B1B3D] to-[#1E3A5F]",
  "from-[#7C3AED] to-[#5B21B6]",
  "from-[#0369A1] to-[#075985]",
  "from-[#B45309] to-[#92400E]",
  "from-[#166534] to-[#14532D]",
  "from-[#9D174D] to-[#831843]",
];

export function SpeakersSection() {
  return (
    <section
      aria-labelledby="speakers-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      id="speakers"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37]">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2
            id="speakers-heading"
            className="text-xl font-bold text-[#0B1B3D] sm:text-2xl"
          >
            المتحدثون واللجنة
          </h2>
          <p className="text-xs text-[#6B7280] sm:text-sm">
            نخبة من العلماء والخبراء والمختصين
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {speakers.map((speaker, i) => {
          const track = speaker.trackId
            ? getTrackById(speaker.trackId)
            : null;
          const gradient =
            AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
          return (
            <motion.article
              key={speaker.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-5 text-center shadow-sm transition-all hover:border-[#D4AF37]/50 hover:shadow-lg"
            >
              {/* Avatar */}
              <div className="relative">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-2xl font-bold text-white shadow-md ring-2 ring-[#D4AF37]/30 transition-transform group-hover:scale-105`}
                  aria-hidden
                >
                  {speaker.initials}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-[#D4AF37]"
                  aria-hidden
                />
              </div>
              {/* Name + role */}
              <div>
                <h3
                  className="text-sm font-bold text-[#0B1B3D]"
                  dir="rtl"
                >
                  {speaker.name}
                </h3>
                <p
                  className="mt-0.5 text-xs font-medium text-[#D4AF37]"
                  dir="rtl"
                >
                  {speaker.role}
                </p>
              </div>
              {/* Affiliation */}
              <p
                className="text-[11px] leading-snug text-[#6B7280]"
                dir="rtl"
              >
                {speaker.affiliation}
              </p>
              {/* Track tag */}
              {track && (
                <span
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-2.5 py-1 text-[10px] font-semibold text-[#0B1B3D]"
                  dir="rtl"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden />
                  {`المحور ${track.id}`}
                </span>
              )}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
