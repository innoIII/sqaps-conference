"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Header / Hero
 *
 * The premium navy hero for the conference portal. Shows the academy emblem,
 * the conference title (gold), the subtitle (white) and a subtle geometric
 * pattern overlay. Stays purely presentational — no data fetching here.
 */
export function Header() {
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
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.16), transparent 70%)",
        }}
      />
      {/* Bottom fade into page background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F6F8]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-12 text-center sm:px-6 sm:pt-16 md:pb-28">
        {/* Academy emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-3 rounded-full bg-[#D4AF37]/10 blur-xl" />
          <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-[#D4AF37]/30 ring-offset-2 ring-offset-[#0B1B3D] sm:h-32 sm:w-32 md:h-36 md:w-36">
            <Image
              src="/logo/academy-logo.png"
              alt="شعار أكاديمية السلطان قابوس لعلوم الشرطة"
              fill
              priority
              sizes="144px"
              className="object-contain"
            />
          </div>
        </motion.div>

        {/* Academy name */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-5 text-sm font-medium tracking-wide text-white/70 sm:text-base"
        >
          أكاديمية السلطان قابوس لعلوم الشرطة
        </motion.p>

        {/* Gold divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="gold-divider mt-4 h-px w-40 sm:w-56"
        />

        {/* Conference title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 text-3xl font-extrabold leading-tight text-[#D4AF37] sm:text-4xl md:text-5xl md:leading-tight"
        >
          المؤتمر العلمي الدولي الثالث
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-3 text-xl font-semibold text-white sm:text-2xl md:text-3xl"
        >
          الجرائم العابرة للحدود
        </motion.p>

        {/* Edition chip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/5 px-5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          النسخة الثالثة &nbsp;·&nbsp; ملفات وأوراق علمية
        </motion.div>
      </div>
    </header>
  );
}
