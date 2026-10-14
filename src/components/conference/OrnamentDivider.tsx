"use client";

import { motion } from "framer-motion";

interface OrnamentDividerProps {
  className?: string;
}

/**
 * Decorative gold ornament divider — a thin line with a centered rotated
 * diamond + dot. Used between major sections to add a premium, official feel
 * inspired by Arabic/Islamic geometric ornamentation.
 */
export function OrnamentDivider({ className = "" }: OrnamentDividerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.6 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`flex items-center justify-center gap-3 ${className}`}
      aria-hidden
    >
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37]/60 sm:w-24" />
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-[#D4AF37]/60" />
        <span className="h-2 w-2 rotate-45 bg-[#D4AF37]" />
        <span className="h-1 w-1 rounded-full bg-[#D4AF37]/60" />
      </span>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37]/60 sm:w-24" />
    </motion.div>
  );
}
