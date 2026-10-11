"use client";

import { motion } from "framer-motion";
import { Users, MapPin, Briefcase, Mic2, Globe } from "lucide-react";
import { keynoteSpeakers, type KeynoteSpeaker } from "@/lib/conference-info";
import { SectionHeading } from "./SectionHeading";

/**
 * Generate initials from a speaker's name (e.g. "د. عبدالله العامري" → "عع").
 * Falls back to the first two letters of the first word.
 */
function getInitials(name: string): string {
  // Strip honorifics like د./أ./م./أ.د.
  const cleaned = name
    .replace(/^(د\.|أ\.د\.|أ\.|م\.|أ\.م\.|د\.|بروفيسور)\s*/g, "")
    .trim();
  // Split into words and take the first letter of each of the first two words.
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "؟";
  if (words.length === 1) return words[0].slice(0, 2);
  // For Arabic names like "عبدالله بن سعيد العامري", prefer first name's
  // first letter + last name's first letter.
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return `${first}${last}`;
}

/** A single speaker card. */
function SpeakerCard({ speaker, index }: { speaker: KeynoteSpeaker; index: number }) {
  const initials = getInitials(speaker.name);
  const isKeynote = speaker.keynote === true;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className={[
        "group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-white p-5 text-center shadow-sm transition-all hover:shadow-lg",
        isKeynote
          ? "border-[#D4AF37]/40 hover:shadow-[#D4AF37]/10"
          : "border-[#E2E5EC] hover:shadow-[#0B1B3D]/5",
      ].join(" ")}
    >
      {/* Top gold accent bar (keynote only) */}
      {isKeynote && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#D4AF37] via-[#E6C869] to-[#D4AF37]"
        />
      )}

      {/* Keynote badge (top-right corner) */}
      {isKeynote && (
        <span
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-2 py-0.5 text-[9px] font-bold text-[#0B1B3D] shadow-sm"
          dir="rtl"
        >
          <Mic2 className="h-2.5 w-2.5 text-[#D4AF37]" aria-hidden />
          رئيسي
        </span>
      )}

      {/* Avatar with initials (gold ring for keynote) */}
      <div className="relative mb-4 mt-2">
        {/* Decorative rotating ring (keynote only) */}
        {isKeynote && (
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1.5 rounded-full border border-dashed border-[#D4AF37]/30"
          />
        )}
        <span
          className={[
            "relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-extrabold shadow-md ring-4 ring-offset-2 ring-offset-white transition-transform group-hover:scale-105",
            isKeynote
              ? "bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37] ring-[#D4AF37]/30"
              : "bg-gradient-to-br from-[#0B1B3D] to-[#1E3A5F] text-white ring-[#E2E5EC]",
          ].join(" ")}
        >
          {initials}
        </span>
      </div>

      {/* Name */}
      <h3
        className="text-base font-bold leading-snug text-[#0B1B3D]"
        dir="rtl"
      >
        {speaker.name}
      </h3>

      {/* Role */}
      <p
        className="mt-1 text-xs font-semibold text-[#D4AF37]"
        dir="rtl"
      >
        {speaker.role}
      </p>

      {/* Organization + country */}
      <div className="mt-2 space-y-1 text-[11px] text-[#6B7280]">
        <p className="flex items-center justify-center gap-1" dir="rtl">
          <Briefcase className="h-3 w-3 text-[#9CA3AF]" aria-hidden />
          <span className="truncate">{speaker.organization}</span>
        </p>
        <p className="flex items-center justify-center gap-1" dir="rtl">
          <Globe className="h-3 w-3 text-[#9CA3AF]" aria-hidden />
          <span>{speaker.country}</span>
        </p>
      </div>

      {/* Divider */}
      <div className="my-3 h-px w-12 bg-gradient-to-l from-transparent via-[#E2E5EC] to-transparent" />

      {/* Topic */}
      {speaker.topic && (
        <p
          className="text-xs leading-relaxed text-[#374151] line-clamp-3"
          dir="rtl"
        >
          «{speaker.topic}»
        </p>
      )}
    </motion.article>
  );
}

/**
 * Speakers section — a premium grid of keynote speakers with avatars,
 * roles, organizations, countries, and presentation topics.
 *
 * Featured (keynote) speakers have a gold accent + "رئيسي" badge + rotating
 * dashed ring around their avatar.
 */
export function SpeakersSection() {
  return (
    <section
      aria-labelledby="speakers-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <SectionHeading
        icon={Users}
        title="المتحدثون الرئيسيون"
        subtitle="نخبة من الخبراء والعلماء من السلطنة وخارجها"
        badge={`${keynoteSpeakers.length} متحدث`}
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
          hidden: { transition: { staggerChildren: 0.05 } },
          show: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
      >
        {keynoteSpeakers.map((speaker, i) => (
          <SpeakerCard key={i} speaker={speaker} index={i} />
        ))}
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-center text-xs text-[#9CA3AF]"
        dir="rtl"
      >
        تتضمن قائمة المتحدثين نخبة من العلماء والخبراء والمختصين بالجرائم العابرة للحدود
      </motion.p>
    </section>
  );
}
