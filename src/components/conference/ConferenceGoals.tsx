"use client";

import { motion } from "framer-motion";
import {
  Target,
  Lightbulb,
  Handshake,
  Microscope,
  TrendingUp,
  Award,
} from "lucide-react";

/**
 * ConferenceGoals — a premium section showcasing the conference's
 * objectives and expected outcomes.
 *
 * Displays as an alternating left/right layout with large numbered
 * objectives, each with an icon, title, and description. This gives
 * visitors a clear understanding of what the conference aims to achieve.
 */

const GOALS = [
  {
    icon: Microscope,
    title: "استكشاف الأبعاد العلمية",
    description:
      "تعميق الفهم العلمي للجرائم العابرة للحدود من خلال أحدث الأبحاث والدراسات الميدانية في الأبعاد القانونية والأمنية والتقنية.",
  },
  {
    icon: Handshake,
    title: "تعزيز التعاون الدولي",
    description:
      "بناء جسور التعاون بين المؤسسات الأمنية والقضائية على المستوى الإقليمي والدولي، وتبادل الخبرات في مواجهة الجرائم المتطورة.",
  },
  {
    icon: Lightbulb,
    title: "اقتراح حلول مبتكرة",
    description:
      "تقديم حلول عملية مبتكرة تعتمد على أحدث التقنيات والذكاء الاصطناعي في كشف الجرائم والتحقيق فيها ومواجهتها.",
  },
  {
    icon: TrendingUp,
    title: "صياغة توصيات استراتيجية",
    description:
      "إعداد توصيات علمية وعملية تعزز قدرة المؤسسات الوطنية والإقليمية على الاستجابة الفعّالة للجرائم العابرة للحدود.",
  },
  {
    icon: Award,
    title: "تطوير الكفاءات الوطنية",
    description:
      "رفع كفاءة الكوادر الأمنية والقضائية والإدارية من خلال تبادل الخبرات مع نخبة الخبراء الدوليين والمختصين.",
  },
];

export function ConferenceGoals() {
  return (
    <section
      aria-labelledby="goals-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      {/* Section header */}
      <div className="mb-10 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#F4ECD0]/50 px-4 py-1.5 text-xs font-bold text-[#0B1B3D]"
          dir="rtl"
        >
          <Target className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
          أهداف المؤتمر
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-2xl font-extrabold text-[#0B1B3D] sm:text-3xl"
          dir="rtl"
          id="goals-heading"
        >
          رؤية ورسالة المؤتمر
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-2 max-w-2xl text-sm text-[#6B7280] sm:text-base"
          dir="rtl"
        >
          يسعى المؤتمر لتحقيق خمسة أهداف استراتيجية تخدم رؤية موحدة لمواجهة
          الجرائم العابرة للحدود بأسلوب علمي وتعاون مؤسسي شامل.
        </motion.p>
      </div>

      {/* Goals list — alternating left/right */}
      <div className="space-y-4">
        {GOALS.map((goal, idx) => {
          const isEven = idx % 2 === 0;
          const Icon = goal.icon;
          return (
            <motion.article
              key={goal.title}
              initial={{ opacity: 0, x: isEven ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className={[
                "group relative flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-lg sm:p-6",
                isEven
                  ? "border-[#E2E5EC] hover:border-[#D4AF37]/40"
                  : "border-[#E2E5EC] hover:border-[#D4AF37]/40",
              ].join(" ")}
            >
              {/* Number badge (large, faint) */}
              <span
                className="absolute -top-3 select-none font-mono text-5xl font-extrabold leading-none text-[#0B1B3D]/5"
                aria-hidden
                style={{ [isEven ? "right" : "left"]: "1rem" } as React.CSSProperties}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Icon */}
              <div className="relative flex shrink-0">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37] shadow-md transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                {/* Gold ring decoration */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl border-2 border-[#D4AF37]/0 transition-all duration-500 group-hover:border-[#D4AF37]/30 group-hover:scale-110"
                />
              </div>

              {/* Content */}
              <div className="relative min-w-0 flex-1 pt-1">
                <h3
                  className="mb-1 text-base font-bold text-[#0B1B3D] sm:text-lg"
                  dir="rtl"
                >
                  {goal.title}
                </h3>
                <p
                  className="text-xs leading-relaxed text-[#6B7280] sm:text-sm"
                  dir="rtl"
                >
                  {goal.description}
                </p>
              </div>

              {/* Bottom accent — slides in on hover */}
              <span
                aria-hidden
                className="absolute bottom-0 right-0 h-0.5 w-0 bg-gradient-to-l from-[#D4AF37] to-transparent transition-all duration-500 group-hover:w-full"
              />
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
