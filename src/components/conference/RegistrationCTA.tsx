"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Mail, ArrowLeft } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * Registration CTA banner. Premium navy gradient with gold accents.
 * Links open a mailto: in a new tab (no backend yet — easy to extend).
 */
export function RegistrationCTA() {
  const subject = encodeURIComponent(
    `طلب تسجيل – ${conferenceInfo.title} ${conferenceInfo.subtitle}`,
  );
  const mailto = `mailto:register@squaps.edu.om?subject=${subject}`;

  return (
    <section
      id="register"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#0B1B3D] via-[#0B1B3D] to-[#07152F] px-6 py-10 text-center shadow-2xl shadow-[#0B1B3D]/30 sm:px-12 sm:py-14"
      >
        {/* Decorative pattern + glow */}
        <div
          aria-hidden
          className="geometric-pattern pointer-events-none absolute inset-0 opacity-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(212,175,55,0.2), transparent 70%)",
          }}
        />
        {/* Top gold accent */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#D4AF37] via-[#E6C869] to-[#D4AF37]"
        />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37] text-[#0B1B3D] shadow-lg shadow-[#D4AF37]/30"
          >
            <CalendarCheck className="h-7 w-7" aria-hidden />
          </motion.div>

          <h2
            className="text-2xl font-extrabold text-[#D4AF37] sm:text-3xl md:text-4xl"
            dir="rtl"
          >
            سجّل في المؤتمر
          </h2>
          <p
            className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base"
            dir="rtl"
          >
            انضم إلى نخبة من العلماء والخبراء الدوليين في المؤتمر العلمي الدولي
            الثالث، وكن جزءًا من الحوار حول مستقبل مواجهة الجرائم العابرة للحدود.
          </p>

          {/* Date + venue chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/5 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur-sm sm:text-sm"
              dir="rtl"
            >
              <CalendarCheck className="h-4 w-4 text-[#D4AF37]" aria-hidden />
              {conferenceInfo.dates}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/5 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur-sm sm:text-sm"
              dir="rtl"
            >
              {conferenceInfo.city}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={mailto}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-8 text-sm font-bold text-[#0B1B3D] shadow-lg shadow-[#D4AF37]/20 transition-all hover:bg-[#E6C869] hover:shadow-xl"
              dir="rtl"
            >
              <Mail className="h-5 w-5" aria-hidden />
              تقديم طلب التسجيل
            </a>
            <a
              href="#schedule"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("schedule")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              dir="rtl"
            >
              استعرض البرنامج
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </a>
          </div>

          <p
            className="mt-5 text-xs text-white/50"
            dir="rtl"
          >
            التسجيل مفتوح للباحثين والمختصين ومدارات المؤسسات الأمنية والقضائية
          </p>
        </div>
      </motion.div>
    </section>
  );
}
