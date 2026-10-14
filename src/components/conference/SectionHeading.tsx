"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface SectionHeadingProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
}

/**
 * Reusable premium section heading: gradient navy icon badge + title + subtitle
 * + optional gold badge. Used by About / Tracks / Schedule sections for visual
 * consistency. Animates in on scroll.
 */
export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  badge,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="mb-8 flex items-center gap-3"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37] shadow-sm">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-[#0B1B3D] sm:text-2xl">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[#6B7280] sm:text-sm">{subtitle}</p>
        )}
      </div>
      {badge && (
        <span className="hidden items-center gap-1.5 rounded-full bg-[#F4ECD0] px-3 py-1 text-xs font-bold text-[#0B1B3D] sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          {badge}
        </span>
      )}
    </motion.div>
  );
}
