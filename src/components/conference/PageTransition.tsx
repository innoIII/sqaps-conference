"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * PageTransition — wraps page content with a smooth fade+slide-up entrance
 * animation. Used to add a polished page-load transition between sections.
 *
 * The transition runs once on mount (not on every scroll) — this is a
 * page-load effect, not a scroll-triggered one.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ y: 12 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
