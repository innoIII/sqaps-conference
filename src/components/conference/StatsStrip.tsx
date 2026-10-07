"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { FileText, Globe, Users, CalendarDays } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";
import { useSiteContentValue } from "./SiteContentProvider";

/** Icons for each stat index (defaults to FileText if no match). */
const STAT_ICONS = [FileText, Globe, Users, CalendarDays];

/** Parse a numeric value from a string like "+50" or "٢٠" (Arabic-Indic). */
function parseValue(raw: string): { num: number; prefix: string; suffix: string } {
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const match = latin.match(/([^\d]*)(\d+)([^\d]*)/);
  if (!match) return { num: 0, prefix: "", suffix: "" };
  return {
    prefix: match[1] ?? "",
    num: parseInt(match[2] ?? "0", 10),
    suffix: match[3] ?? "",
  };
}

/** Convert a number to Arabic-Indic digits (for display). */
function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/** A real count-up component using IntersectionObserver + rAF. */
function CountUpValue({
  target,
  prefix,
  suffix,
}: {
  target: number;
  prefix: string;
  suffix: string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView || target === 0) return;
    let raf: number;
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {prefix}
      {toArabicDigits(value)}
      {suffix}
    </span>
  );
}

/**
 * Stats strip — sits right below the hero (overlapping it slightly).
 * Animated count-up style entrance. Premium dark-on-gold treatment.
 *
 * Each stat now has:
 *   - A context icon (FileText / Globe / Users / CalendarDays)
 *   - An animated count-up from 0 to the target value
 *   - A hover-activated bottom accent line
 */
export function StatsStrip() {
  const { get } = useSiteContentValue();

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
        {/* Top gold accent line */}
        <div className="h-0.5 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />

        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#D4AF37]/15 md:grid-cols-4">
          {conferenceInfo.stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? FileText;
            const rawValue = get(`conference.stats.${i}.value`, stat.value);
            const label = get(`conference.stats.${i}.label`, stat.label);
            const { num, prefix, suffix } = parseValue(rawValue);

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="group relative flex flex-col items-center justify-center gap-2 px-3 py-6 text-center transition-colors hover:bg-white/[0.03] sm:py-7"
              >
                {/* Icon badge */}
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.7 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] transition-all group-hover:scale-110 group-hover:bg-[#D4AF37]/20"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </motion.span>

                {/* Value with count-up */}
                <span
                  className="text-2xl font-extrabold text-[#D4AF37] sm:text-3xl md:text-4xl"
                  dir="rtl"
                >
                  <CountUpValue target={num} prefix={prefix} suffix={suffix} />
                </span>

                {/* Label */}
                <span
                  className="text-xs font-medium text-white/70 sm:text-sm"
                  dir="rtl"
                >
                  {label}
                </span>

                {/* Bottom accent line — appears on hover */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-[#D4AF37] transition-all duration-500 group-hover:w-12"
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
