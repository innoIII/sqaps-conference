"use client";

import { motion } from "framer-motion";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";
import { useSiteContentValue } from "./SiteContentProvider";

/**
 * Header / Hero
 *
 * Premium navy hero for the conference portal. Shows the academy emblem, the
 * conference title (gold gradient), the subtitle, a tagline, and a row of
 * quick facts (dates / duration / venue). Subtle Islamic geometric pattern
 * overlay kept restrained and non-distracting.
 */
export function Header() {
  const { get } = useSiteContentValue();
  const facts = [
    { icon: CalendarDays, label: get("conference.dates", conferenceInfo.dates) },
    { icon: Clock, label: get("conference.duration", conferenceInfo.duration) },
    { icon: MapPin, label: get("conference.city", conferenceInfo.city) },
  ];

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#0B1B3D] via-[#071330] to-[#040A1F] text-white">
      {/* Subtle Islamic / Arabic geometric pattern overlay */}
      <div
        aria-hidden
        className="geometric-pattern pointer-events-none absolute inset-0 opacity-60"
      />
      {/* Radial gold glow — enhanced, more luxurious */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.28), transparent 65%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(212,175,55,0.12), transparent 70%)",
        }}
      />
      {/* Animated gold light sweep — subtle, moves slowly across the top */}
      <motion.div
        aria-hidden
        initial={{ x: "-30%" }}
        animate={{ x: "130%" }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
        className="pointer-events-none absolute top-0 h-40 w-1/3 opacity-20 blur-2xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)",
        }}
      />
      {/* Decorative corner ornaments (RTL: top-right + top-left) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-6 h-24 w-24 opacity-[0.15] sm:right-10 sm:top-10 sm:h-32 sm:w-32"
        style={{
          backgroundImage:
            "radial-gradient(circle, transparent 30%, #D4AF37 31%, #D4AF37 33%, transparent 34%), radial-gradient(circle, transparent 60%, #D4AF37 61%, #D4AF37 63%, transparent 64%)",
          backgroundSize: "100% 100%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 top-6 h-24 w-24 scale-x-[-1] opacity-[0.15] sm:left-10 sm:top-10 sm:h-32 sm:w-32"
        style={{
          backgroundImage:
            "radial-gradient(circle, transparent 30%, #D4AF37 31%, #D4AF37 33%, transparent 34%), radial-gradient(circle, transparent 60%, #D4AF37 61%, #D4AF37 63%, transparent 64%)",
          backgroundSize: "100% 100%",
        }}
      />
      {/* Bottom fade into page background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F6F8]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-24 pt-14 text-center sm:px-6 sm:pt-20 md:pb-32">
        {/* Dual logos: academy (right) — vertical interactive line — conference (left) */}
        <motion.div
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="group relative flex items-center gap-3 sm:gap-5"
        >
          {/* Academy logo (RIGHT — first in RTL) — 3D effect, no box, no glow */}
          <motion.div
            whileHover={{ scale: 1.05, rotateY: -8 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
            style={{ perspective: 1000 }}
          >
            <img
              src="/logo/academy-logo.webp"
              width={96}
              height={96}
              fetchPriority="high"
              alt="شعار أكاديمية السلطان قابوس لعلوم الشرطة"
              className="h-16 w-16 object-contain drop-shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24"
            />
          </motion.div>

          {/* Vertical interactive connecting line — animated gold gradient */}
          <div
            className="relative flex h-16 w-1 flex-col items-center justify-center sm:h-20 md:h-24"
            aria-hidden
          >
            {/* Base vertical line */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[#D4AF37]/30 via-[#D4AF37] to-[#D4AF37]/30" />
            {/* Animated shimmer sweep (vertical) */}
            <motion.div
              animate={{ y: [-40, 40] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute h-8 w-0.5 bg-gradient-to-b from-transparent via-white to-transparent"
            />
            {/* Center diamond accent */}
            <motion.span
              animate={{ rotate: [0, 180, 360] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              className="relative h-2 w-2 rotate-45 bg-[#D4AF37] shadow-md shadow-[#D4AF37]/50"
            />
          </div>

          {/* Conference logo (LEFT — second in RTL) — 3D effect, no box, no glow */}
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 8 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
            style={{ perspective: 1000 }}
          >
            <img
              src="/logo/conference-logo.webp"
              width={96}
              height={96}
              fetchPriority="high"
              alt="شعار المؤتمر العلمي الدولي الثالث"
              className="h-16 w-16 object-contain drop-shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24"
            />
          </motion.div>
        </motion.div>

        {/* Academy name */}
        <motion.p
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 text-sm font-medium tracking-wide text-white/70 sm:text-base"
        >
          {get("conference.academy", conferenceInfo.academy)}
        </motion.p>

        {/* Gold divider with diamond */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-4 flex items-center gap-3"
        >
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37] sm:w-24" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" />
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37] sm:w-24" />
        </motion.div>

        {/* Conference title — gold gradient for premium feel */}
        <motion.h1
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-7 text-3xl font-extrabold leading-[1.35] tracking-tight sm:text-4xl md:text-5xl"
          style={{
            background: "linear-gradient(180deg, #F0D77A 0%, #D4AF37 60%, #B8941F 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {get("conference.title", conferenceInfo.title)}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-3 text-2xl font-bold leading-snug text-[#E2E8F0] sm:text-3xl md:text-4xl"
        >
          {get("conference.subtitle", conferenceInfo.subtitle)}
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base"
        >
          {get("conference.tagline", conferenceInfo.tagline)}
        </motion.p>

        {/* Quick facts row */}
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.56 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {facts.map((f) => (
            <div
              key={f.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur-sm sm:text-sm"
            >
              <f.icon className="h-4 w-4 text-[#D4AF37]" aria-hidden />
              <span dir="rtl">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
