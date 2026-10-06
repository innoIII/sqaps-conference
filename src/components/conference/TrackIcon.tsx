"use client";

import {
  Scale,
  ShieldAlert,
  Cpu,
  Landmark,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { TrackIconKey } from "@/types";

/** Map a track theme key → its Lucide icon + accent gradient. */
const ICON_MAP: Record<
  TrackIconKey,
  { Icon: LucideIcon; label: string; gradient: string }
> = {
  law: {
    Icon: Scale,
    label: "قانون",
    gradient: "from-[#B45309] to-[#92400E]",
  },
  security: {
    Icon: ShieldAlert,
    label: "أمن",
    gradient: "from-[#0B1B3D] to-[#1E3A5F]",
  },
  technology: {
    Icon: Cpu,
    label: "تقنية",
    gradient: "from-[#0369A1] to-[#075985]",
  },
  governance: {
    Icon: Landmark,
    label: "حوكمة",
    gradient: "from-[#166534] to-[#14532D]",
  },
  media: {
    Icon: Megaphone,
    label: "إعلام",
    gradient: "from-[#7C3AED] to-[#5B21B6]",
  },
};

interface TrackIconProps {
  icon: TrackIconKey;
  /** When true, render the filled badge style (for selected cards). */
  filled?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * Dynamic, context-aware track icon.
 *
 * Each conference track has a theme (law / security / technology / governance /
 * media). This component resolves the theme to a meaningful Lucide icon with a
 * matching brand-tinted gradient — so tracks are visually distinguishable at a
 * glance instead of all sharing a generic number badge.
 */
export function TrackIcon({
  icon,
  filled = false,
  className = "",
  iconClassName = "h-5 w-5",
}: TrackIconProps) {
  const { Icon } = ICON_MAP[icon];
  return <Icon className={`${iconClassName} ${className}`} aria-hidden />;
}

/** The accent gradient classes for a given theme (used by badges/borders). */
export function getTrackGradient(icon: TrackIconKey): string {
  return ICON_MAP[icon].gradient;
}

/** Short Arabic label for a theme (used in tooltips / badges). */
export function getTrackThemeLabel(icon: TrackIconKey): string {
  return ICON_MAP[icon].label;
}
