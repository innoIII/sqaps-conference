"use client";

import { motion } from "framer-motion";
import {
  CalendarRange,
  Mic2,
  Coffee,
  Users,
  KeyRound,
  ChevronLeft,
} from "lucide-react";
import { schedule, type ScheduleDay } from "@/lib/conference-info";
import { getTrackById } from "@/lib/tracks";

const TYPE_META: Record<
  ScheduleDay["sessions"][number]["type"],
  { icon: typeof Mic2; label: string; tint: string; bg: string; bar: string }
> = {
  keynote: {
    icon: KeyRound,
    label: "كلمة رئيسية",
    tint: "text-[#D4AF37]",
    bg: "bg-[#0B1B3D]",
    bar: "bg-[#D4AF37]",
  },
  session: {
    icon: Mic2,
    label: "جلسة علمية",
    tint: "text-[#0B1B3D]",
    bg: "bg-[#F4ECD0]",
    bar: "bg-[#0B1B3D]",
  },
  break: {
    icon: Coffee,
    label: "استراحة",
    tint: "text-[#6B7280]",
    bg: "bg-[#F5F6F8]",
    bar: "bg-[#E2E5EC]",
  },
  panel: {
    icon: Users,
    label: "ندوة حوارية",
    tint: "text-[#0B1B3D]",
    bg: "bg-[#E0E7FF]",
    bar: "bg-[#0B1B3D]",
  },
};

/**
 * Conference program — a 3-day timeline with session types color-coded.
 * Each session links back to its track when applicable.
 */
export function ScheduleSection() {
  return (
    <section
      aria-labelledby="schedule-heading"
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
          <CalendarRange className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2
            id="schedule-heading"
            className="text-xl font-bold text-[#0B1B3D] sm:text-2xl"
          >
            برنامج المؤتمر
          </h2>
          <p className="text-xs text-[#6B7280] sm:text-sm">
            الجلسات والفعاليات على مدار ثلاثة أيام
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {schedule.map((day, dayIdx) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: dayIdx * 0.1 }}
            className="flex flex-col overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
          >
            {/* Day header */}
            <div className="bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white" dir="rtl">
                    {day.day}
                  </h3>
                  <p className="text-xs text-[#D4AF37]" dir="rtl">
                    {day.date}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-[#0B1B3D]">
                  {dayIdx + 1}
                </span>
              </div>
            </div>

            {/* Sessions */}
            <ol className="relative flex-1 px-4 py-4 sm:px-5">
              {day.sessions.map((session, i) => {
                const meta = TYPE_META[session.type];
                const track = session.trackId
                  ? getTrackById(session.trackId)
                  : null;
                return (
                  <li
                    key={i}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {/* Timeline rail */}
                    {i < day.sessions.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute right-[18px] top-9 h-[calc(100%-1.5rem)] w-px bg-[#E2E5EC]"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.tint}`}
                    >
                      <meta.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold text-[#0B1B3D]"
                          dir="rtl"
                        >
                          {session.time}
                        </span>
                        <span
                          className={`rounded-full ${meta.bg} px-2 py-0.5 text-[10px] font-medium ${meta.tint}`}
                          dir="rtl"
                        >
                          {meta.label}
                        </span>
                      </div>
                      <h4
                        className="mt-1 text-sm font-semibold leading-snug text-[#0B1B3D]"
                        dir="rtl"
                      >
                        {session.title}
                      </h4>
                      {session.speaker && (
                        <p className="mt-0.5 text-xs text-[#6B7280]" dir="rtl">
                          {session.speaker}
                        </p>
                      )}
                      {track && (
                        <span
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D4AF37]"
                          dir="rtl"
                        >
                          <ChevronLeft className="h-3 w-3" aria-hidden />
                          {track.title.replace("المحور ", "المحور ")}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
