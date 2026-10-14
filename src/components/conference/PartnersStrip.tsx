"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Landmark,
  Gavel,
  FileBadge,
  Building2,
  Users,
} from "lucide-react";

/**
 * PartnersStrip — a premium section showcasing the organizing partners
 * and supporting institutions of the conference.
 *
 * Renders as a horizontal strip of partner cards with icons, shown in a
 * clean grid layout. Each card has a subtle hover effect.
 *
 * This sits right before the footer to close the page with institutional
 * branding.
 */
const PARTNERS = [
  {
    icon: ShieldCheck,
    name: "أكاديمية السلطان قابوس لعلوم الشرطة",
    role: "المنظِّم الرئيسي",
  },
  {
    icon: Landmark,
    name: "مركز البحوث والدراسات",
    role: "المضيف الأكاديمي",
  },
  {
    icon: Gavel,
    name: "وزارة العدل",
    role: "الشريك القانوني",
  },
  {
    icon: FileBadge,
    name: "النيابة العامة",
    role: "الشريك القضائي",
  },
  {
    icon: Building2,
    name: "الهيئة الوطنية لحماية البيانات",
    role: "الشريك التقني",
  },
  {
    icon: Users,
    name: "مجلس التعاون الخليجي",
    role: "الشريك الإقليمي",
  },
];

export function PartnersStrip() {
  return (
    <section
      aria-label="الشركاء والجهات المنظمة"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      {/* Section header */}
      <div className="mb-8 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#F4ECD0]/50 px-4 py-1.5 text-xs font-bold text-[#0B1B3D]"
          dir="rtl"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden />
          الجهات المنظمة والشركاء
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-xl font-extrabold text-[#0B1B3D] sm:text-2xl"
          dir="rtl"
        >
          بتعاون مؤسسي شامل
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-2 max-w-xl text-sm text-[#6B7280]"
          dir="rtl"
        >
          ينظّر المؤتمر بالتعاون مع نخبة من المؤسسات الأمنية والقضائية والتقنية
          المحلية والإقليمية.
        </motion.p>
      </div>

      {/* Partners grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PARTNERS.map((partner, idx) => (
          <motion.div
            key={partner.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
            className="group relative flex flex-col items-center gap-2 rounded-xl border border-[#E2E5EC] bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-[#D4AF37]/40 hover:shadow-md"
          >
            {/* Icon badge */}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F6F8] text-[#0B1B3D] transition-all group-hover:bg-[#0B1B3D] group-hover:text-[#D4AF37]">
              <partner.icon className="h-6 w-6" aria-hidden />
            </span>
            {/* Name */}
            <p
              className="text-[11px] font-bold leading-snug text-[#0B1B3D] sm:text-xs"
              dir="rtl"
            >
              {partner.name}
            </p>
            {/* Role */}
            <span
              className="rounded-full bg-[#F4ECD0]/50 px-2 py-0.5 text-[9px] font-semibold text-[#9B7C0E]"
              dir="rtl"
            >
              {partner.role}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
