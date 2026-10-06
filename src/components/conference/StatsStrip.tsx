"use client";

import { motion } from "framer-motion";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * Stats strip — sits right below the hero (overlapping it slightly).
 * Animated count-up style entrance. Premium dark-on-gold treatment.
 */
export function StatsStrip() {
  return (
    <section
      aria-label="إحصائيات المؤتمر"
      className="relative z-10 mx-auto -mt-10 w-full max-w-6xl px-4 sm:-mt-14 sm:px-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] shadow-xl shadow-[#0B1B3D]/20"
      >
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#D4AF37]/15 md:grid-cols-4">
          {conferenceInfo.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
              className="flex flex-col items-center justify-center gap-1 px-3 py-6 text-center sm:py-7"
            >
              <span
                className="text-2xl font-extrabold text-[#D4AF37] sm:text-3xl md:text-4xl"
                dir="rtl"
              >
                {stat.value}
              </span>
              <span className="text-xs font-medium text-white/70 sm:text-sm" dir="rtl">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
