"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Clock, ArrowDown, Send } from "lucide-react";
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
    <header className="relative overflow-hidden bg-[#0B1B3D] text-white">
      {/* Subtle Islamic / Arabic geometric pattern overlay */}
      <div
        aria-hidden
        className="geometric-pattern pointer-events-none absolute inset-0 opacity-60"
      />
      {/* Radial gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(212,175,55,0.18), transparent 70%)",
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
        {/* Academy emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-3 rounded-full bg-[#D4AF37]/10 blur-xl" />
          {/* Decorative rotating ring */}
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-full border border-dashed border-[#D4AF37]/20"
          />
          <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-[#D4AF37]/30 ring-offset-2 ring-offset-[#0B1B3D] sm:h-32 sm:w-32 md:h-40 md:w-40">
            <Image
              src="/logo/academy-logo.png"
              alt="شعار أكاديمية السلطان قابوس لعلوم الشرطة"
              fill
              priority
              sizes="160px"
              className="object-contain"
            />
          </div>
        </motion.div>

        {/* Academy name */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 text-sm font-medium tracking-wide text-white/70 sm:text-base"
        >
          {get("conference.academy", conferenceInfo.academy)}
        </motion.p>

        {/* Gold divider with diamond */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-4 flex items-center gap-3"
        >
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37] sm:w-24" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" />
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37] sm:w-24" />
        </motion.div>

        {/* Conference title — gold gradient for premium feel */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-3 text-2xl font-bold leading-snug text-[#E2E8F0] sm:text-3xl md:text-4xl"
        >
          {get("conference.subtitle", conferenceInfo.subtitle)}
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base"
        >
          {get("conference.tagline", conferenceInfo.tagline)}
        </motion.p>

        {/* Quick facts row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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

        {/* CTA buttons row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.66 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            onClick={() => {
              document
                .getElementById("tracks")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-[#D4AF37] to-[#E6C869] px-6 text-sm font-bold text-[#0B1B3D] shadow-lg shadow-[#D4AF37]/20 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/30 sm:text-base"
            dir="rtl"
          >
            <span>استعراض المحاور</span>
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden />
          </motion.button>
          <motion.a
            href="/qn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-[#D4AF37]/50 hover:bg-white/10 sm:text-base"
            dir="rtl"
          >
            <Send className="h-4 w-4 text-[#D4AF37]" aria-hidden />
            <span>اطرح سؤالك</span>
          </motion.a>
        </motion.div>
      </div>
    </header>
  );
}
