"use client";

import { motion } from "framer-motion";
import { Info, MapPin, CalendarDays, Clock, Quote } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * About the conference — a premium two-column section:
 *  - Right (RTL first): heading + intro paragraphs + pull-quote
 *  - Left: an info card with dates / venue / duration
 */
export function AboutSection() {
  const facts = [
    { icon: CalendarDays, label: "تاريخ الانعقاد", value: conferenceInfo.dates },
    { icon: Clock, label: "المدة", value: conferenceInfo.duration },
    { icon: MapPin, label: "المكان", value: conferenceInfo.venue },
  ];

  return (
    <section
      aria-labelledby="about-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
        {/* Intro text — spans 3 cols on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-3"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37]">
              <Info className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                id="about-heading"
                className="text-xl font-bold text-[#0B1B3D] sm:text-2xl"
              >
                عن المؤتمر
              </h2>
              <p className="text-xs text-[#6B7280] sm:text-sm">
                رؤية المؤتمر وأهدافه ومحاوره
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {conferenceInfo.about.map((para, i) => (
              <p
                key={i}
                className="text-sm leading-[2] text-[#374151] sm:text-base sm:leading-[2]"
                dir="rtl"
              >
                {para}
              </p>
            ))}
          </div>

          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 flex gap-3 rounded-2xl border-r-4 border-[#D4AF37] bg-[#F4ECD0]/40 p-4 sm:p-5"
          >
            <Quote className="h-6 w-6 shrink-0 text-[#D4AF37]" aria-hidden />
            <p
              className="text-sm font-semibold leading-relaxed text-[#0B1B3D] sm:text-base"
              dir="rtl"
            >
              {conferenceInfo.tagline}
            </p>
          </motion.blockquote>
        </motion.div>

        {/* Info card — spans 2 cols on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-lg shadow-[#0B1B3D]/5">
            <div className="bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 sm:px-6">
              <h3 className="text-base font-bold text-white sm:text-lg" dir="rtl">
                تفاصيل الانعقاد
              </h3>
              <p className="text-xs text-white/70" dir="rtl">
                معلومات المؤتمر الأساسية
              </p>
            </div>
            <ul className="divide-y divide-[#E2E5EC]">
              {facts.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4ECD0] text-[#0B1B3D]">
                    <f.icon className="h-5 w-5 text-[#D4AF37]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#6B7280]" dir="rtl">
                      {f.label}
                    </p>
                    <p
                      className="truncate text-sm font-semibold text-[#0B1B3D] sm:text-base"
                      dir="rtl"
                      title={f.value}
                    >
                      {f.value}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3 sm:px-6">
              <p className="text-center text-xs text-[#6B7280]" dir="rtl">
                {conferenceInfo.edition} · {conferenceInfo.academy}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
