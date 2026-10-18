"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Honors the visitor's "reduce motion" OS setting for every framer-motion
 * animation on the site: transforms are skipped, opacity fades still run.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
