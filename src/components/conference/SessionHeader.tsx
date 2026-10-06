"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, UserCog, UserCheck } from "lucide-react";
import type { TrackSessionInfo } from "@/types";

interface SessionHeaderProps {
  session: TrackSessionInfo | null;
  loading: boolean;
}

/** A single info cell in the session header. */
function InfoCell({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Clock;
  label: string;
  value?: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[#6B7280]" dir="rtl">
          {label}
        </p>
        {loading ? (
          <div className="mt-1 h-4 w-24 animate-pulse rounded bg-[#E2E5EC]" />
        ) : (
          <p
            className="truncate text-sm font-semibold text-[#0B1B3D]"
            dir="rtl"
            title={value}
          >
            {value || "—"}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Session header — 4 info cells (time / venue / chair / secretary) shown
 * inside the track content card, above the research-papers table.
 */
export function SessionHeader({ session, loading }: SessionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <InfoCell
        icon={Clock}
        label="التوقيت"
        value={session?.time}
        loading={loading}
      />
      <InfoCell
        icon={MapPin}
        label="المكان"
        value={session?.venue}
        loading={loading}
      />
      <InfoCell
        icon={UserCheck}
        label="إدارة الجلسة"
        value={session?.chair}
        loading={loading}
      />
      <InfoCell
        icon={UserCog}
        label="مقرر الجلسة"
        value={session?.secretary}
        loading={loading}
      />
    </motion.div>
  );
}
