"use client";

import { motion } from "framer-motion";
import {
  Scale,
  ShieldAlert,
  Cpu,
  Building2,
  Megaphone,
  Globe2,
} from "lucide-react";
import { useSiteContentValue } from "./SiteContentProvider";

/**
 * ConferenceThemes — a premium visual grid showcasing the 5 conference
 * themes (محاور) as cards with icons, descriptions, and hover effects.
 *
 * This sits between the About section and the Countdown to give visitors
 * a quick visual overview of what the conference covers.
 *
 * Each theme card:
 *  - Has a distinct icon (legal, security, tech, governance, community)
 *  - Shows the theme title + a one-line description
 *  - Hover: lifts up + gold accent border + icon scales
 *  - Entrance: staggered fade-in from bottom
 */
const THEME_ICONS = [Scale, ShieldAlert, Cpu, Building2, Megaphone];

const THEME_DESCRIPTIONS: Record<number, string> = {
  1: "الأطر القانونية والشرعية للجرائم العابرة للحدود والتشريعات الدولية.",
  2: "الاستراتيجيات الأمنية الاستشرافية والتعاون الإقليمي والدولي.",
  3: "الحلول الرقمية الحديثة وتقنيات الذكاء الاصطناعي في مكافحة الجريمة.",
  4: "الحوكمة والإدارة المؤسسية الرشيدة في المواجهة الشاملة للجريمة.",
  5: "دور المجتمع والإعلام في التوعية والوقاية من الجرائم العابرة.",
};

export function ConferenceThemes() {
  const { get } = useSiteContentValue();

  // Build themes from site content (dynamic track count).
  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", "5"), 10) || 5,
  );

  const themes = Array.from({ length: trackCount }, (_, i) => {
    const id = i + 1;
    const Icon = THEME_ICONS[i] ?? Globe2;
    return {
      id,
      title: get(`track.${id}.title`, `المحور ${id}`),
      subtitle: get(`track.${id}.subtitle`, ""),
      description: THEME_DESCRIPTIONS[id] ?? "",
      Icon,
    };
  });

  return (
    <section
      aria-label="محاور المؤتمر"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      {/* Section header */}
      <div className="mb-8 text-center sm:mb-10">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#F4ECD0]/50 px-4 py-1.5 text-xs font-bold text-[#0B1B3D]"
          dir="rtl"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden />
          محاور المؤتمر
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-2xl font-extrabold text-[#0B1B3D] sm:text-3xl"
          dir="rtl"
        >
          خمسة محاور علمية متكاملة
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-2 max-w-2xl text-sm text-[#6B7280] sm:text-base"
          dir="rtl"
        >
          يستعرض المؤتمر خمسة أبعاد رئيسية للجرائم العابرة للحدود — من الإطار
          القانوني إلى دور المجتمع، مرورًا بالاستراتيجيات الأمنية والحلول التقنية
          والحوكمة المؤسسية.
        </motion.p>
      </div>

      {/* Themes grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, idx) => {
          const isWide = idx === 0 || idx === 3; // 1st and 4th take full width on lg.
          return (
            <motion.article
              key={theme.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={{ y: -6 }}
              className={[
                "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all",
                "border-[#E2E5EC] hover:border-[#D4AF37]/50 hover:shadow-xl",
                isWide ? "lg:col-span-1" : "",
              ].join(" ")}
            >
              {/* Top gold accent — appears on hover */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent transition-transform duration-500 group-hover:scale-x-100"
              />

              {/* Theme number badge */}
              <span
                className="absolute -left-2 -top-2 select-none font-mono text-7xl font-extrabold leading-none text-[#0B1B3D]/5 transition-colors group-hover:text-[#D4AF37]/15"
                aria-hidden
              >
                {String(theme.id).padStart(2, "0")}
              </span>

              <div className="relative">
                {/* Icon */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37] shadow-md transition-transform duration-300 group-hover:scale-110">
                    <theme.Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span
                    className="rounded-full bg-[#F4ECD0]/60 px-2.5 py-0.5 text-[10px] font-bold text-[#9B7C0E]"
                    dir="rtl"
                  >
                    المحور {theme.id}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="mb-1.5 text-base font-bold text-[#0B1B3D] transition-colors group-hover:text-[#07152F] sm:text-lg"
                  dir="rtl"
                >
                  {theme.title}
                </h3>

                {/* Subtitle */}
                {theme.subtitle && (
                  <p
                    className="mb-2 text-xs font-semibold text-[#D4AF37]"
                    dir="rtl"
                  >
                    {theme.subtitle}
                  </p>
                )}

                {/* Description */}
                <p
                  className="text-xs leading-relaxed text-[#6B7280] sm:text-sm"
                  dir="rtl"
                >
                  {theme.description}
                </p>
              </div>

              {/* Bottom decorative line */}
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-[#D4AF37] transition-all duration-500 group-hover:w-16"
              />
            </motion.article>
          );
        })}

        {/* CTA card — fills the last slot */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: themes.length * 0.08 }}
          className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0B1B3D] via-[#0B1B3D] to-[#07152F] p-5 text-center shadow-lg"
        >
          {/* Radial glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(212,175,55,0.2), transparent 70%)",
            }}
          />
          <div className="relative">
            <Globe2 className="mb-3 h-10 w-10 text-[#D4AF37]" aria-hidden />
            <h3
              className="mb-1 text-base font-bold text-white sm:text-lg"
              dir="rtl"
            >
              تعاون دولي شامل
            </h3>
            <p
              className="text-xs leading-relaxed text-white/70 sm:text-sm"
              dir="rtl"
            >
              يجمع المؤتمر خبراء من أكثر من ٢٠ دولة لمواجهة الجرائم العابرة
              للحدود بتعاون علمي وعملي.
            </p>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
