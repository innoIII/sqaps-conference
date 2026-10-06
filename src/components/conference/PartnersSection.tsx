"use client";

import { motion } from "framer-motion";
import { Handshake } from "lucide-react";
import { partners, type Partner } from "@/lib/conference-info";

const TIER_LABEL: Record<Partner["tier"], string> = {
  strategic: "الشركاء الاستراتيجيون",
  gold: "الشركاء الذهبيون",
  supporters: "المؤسسات الداعمة",
  supporter: "المؤسسات الداعمة",
};

const TIER_STYLE: Record<Partner["tier"], string> = {
  strategic: "border-[#D4AF37]/40 bg-gradient-to-br from-[#F4ECD0] to-white",
  gold: "border-[#E2E5EC] bg-white",
  supporter: "border-[#E2E5EC] bg-[#F5F6F8]",
  supporters: "border-[#E2E5EC] bg-[#F5F6F8]",
};

export function PartnersSection() {
  const tiers: Partner["tier"][] = ["strategic", "gold", "supporter"];

  return (
    <section
      aria-labelledby="partners-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37]">
          <Handshake className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2
            id="partners-heading"
            className="text-xl font-bold text-[#0B1B3D] sm:text-2xl"
          >
            الشركاء والمؤسسات الداعمة
          </h2>
          <p className="text-xs text-[#6B7280] sm:text-sm">
            بالتعاون مع نخبة من المؤسسات الوطنية والدولية
          </p>
        </div>
      </motion.div>

      <div className="space-y-8">
        {tiers.map((tier) => {
          const tierPartners = partners.filter((p) => p.tier === tier);
          if (tierPartners.length === 0) return null;
          return (
            <div key={tier}>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E2E5EC]" />
                <span
                  className="text-xs font-bold uppercase tracking-wide text-[#6B7280]"
                  dir="rtl"
                >
                  {TIER_LABEL[tier]}
                </span>
                <span className="h-px flex-1 bg-[#E2E5EC]" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tierPartners.map((partner, i) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    whileHover={{ y: -3 }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 text-center transition-all hover:shadow-md ${TIER_STYLE[tier]}`}
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1B3D] text-sm font-extrabold text-[#D4AF37]"
                      aria-hidden
                    >
                      {partner.short}
                    </span>
                    <p
                      className="text-xs font-semibold leading-snug text-[#0B1B3D]"
                      dir="rtl"
                    >
                      {partner.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
