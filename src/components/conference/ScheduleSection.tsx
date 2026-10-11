"use client";

import { motion } from "framer-motion";
import {
  CalendarRange,
  Presentation,
  Coffee,
  MessagesSquare,
  Award,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { schedule, type ScheduleDay } from "@/lib/conference-info";
import { getTrackById } from "@/lib/tracks";
import { SectionHeading } from "./SectionHeading";
import { useSiteContentValue } from "./SiteContentProvider";

const TYPE_META: Record<
  ScheduleDay["sessions"][number]["type"],
  { icon: typeof Presentation; label: string; tint: string; bg: string; bar: string; ring: string }
> = {
  keynote: {
    icon: Award,
    label: "كلمة رئيسية",
    tint: "text-[#D4AF37]",
    bg: "bg-[#0B1B3D]",
    bar: "bg-[#D4AF37]",
    ring: "ring-[#D4AF37]/40",
  },
  session: {
    icon: Presentation,
    label: "جلسة علمية",
    tint: "text-[#0B1B3D]",
    bg: "bg-[#F4ECD0]",
    bar: "bg-[#0B1B3D]",
    ring: "ring-[#0B1B3D]/30",
  },
  break: {
    icon: Coffee,
    label: "استراحة",
    tint: "text-[#6B7280]",
    bg: "bg-[#F5F6F8]",
    bar: "bg-[#E2E5EC]",
    ring: "ring-[#E2E5EC]",
  },
  panel: {
    icon: MessagesSquare,
    label: "ندوة حوارية",
    tint: "text-[#0B1B3D]",
    bg: "bg-[#E0E7FF]",
    bar: "bg-[#0B1B3D]",
    ring: "ring-[#0B1B3D]/30",
  },
};

/**
 * Conference program — a 2-day timeline with session types color-coded.
 * Each session links back to its track when applicable.
 *
 * Styling: premium card layout with timeline rail, color-coded type badges,
 * hover effects, and animated entrance.
 */
export function ScheduleSection() {
  const { get } = useSiteContentValue();

  // Build the day list dynamically from the content map (so admins can
  // add/remove sessions and the public site reflects it).
  const dayCount = Math.max(
    1,
    parseInt(get("schedule.days", String(schedule.length)), 10) || schedule.length,
  );
  const days = Array.from({ length: dayCount }, (_, dayIdx) => {
    const staticDay = schedule[dayIdx];
    const sessionCount = Math.max(
      0,
      parseInt(
        get(`schedule.day${dayIdx + 1}.count`, String(staticDay?.sessions.length ?? 0)),
        10,
      ) || 0,
    );
    const sessions = Array.from({ length: sessionCount }, (_, si) => {
      const staticSession = staticDay?.sessions[si];
      const type = (get(
        `schedule.day${dayIdx + 1}.session.${si}.type`,
        staticSession?.type ?? "session",
      ) as keyof typeof TYPE_META) || "session";
      const trackIdRaw = get(
        `schedule.day${dayIdx + 1}.session.${si}.trackId`,
        staticSession?.trackId != null ? String(staticSession.trackId) : "",
      );
      const trackIdNum = parseInt(trackIdRaw, 10);
      return {
        time: get(`schedule.day${dayIdx + 1}.session.${si}.time`, staticSession?.time ?? ""),
        title: get(`schedule.day${dayIdx + 1}.session.${si}.title`, staticSession?.title ?? ""),
        speaker: get(`schedule.day${dayIdx + 1}.session.${si}.speaker`, staticSession?.speaker ?? ""),
        type,
        trackId: Number.isFinite(trackIdNum) ? trackIdNum : undefined,
      };
    });
    return {
      day: get(`schedule.day${dayIdx + 1}.label`, staticDay?.day ?? `اليوم ${dayIdx + 1}`),
      date: get(`schedule.day${dayIdx + 1}.date`, staticDay?.date ?? ""),
      sessions,
    };
  });

  return (
    <section
      aria-labelledby="schedule-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <SectionHeading
        icon={CalendarRange}
        title="برنامج المؤتمر"
        subtitle="الجلسات والفعاليات على مدار يومين"
        badge="يومان"
      />

      <div
        className="grid grid-cols-1 gap-6"
        style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 2)}, minmax(0, 1fr))` }}
      >
        {days.map((day, dayIdx) => (
          <motion.div
            key={dayIdx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: dayIdx * 0.1 }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-[#0B1B3D]/5"
          >
            {/* Day header with gold accent */}
            <div className="relative bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent"
              />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white" dir="rtl">
                    {day.day}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#D4AF37]" dir="rtl">
                    <CalendarRange className="h-3 w-3" aria-hidden />
                    {day.date}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF37] text-base font-bold text-[#0B1B3D] shadow-md ring-4 ring-white/10">
                  {dayIdx + 1}
                </span>
              </div>
            </div>

            {/* Sessions */}
            <ol className="relative flex-1 px-4 py-4 sm:px-5">
              {day.sessions.map((session, i) => {
                const meta = TYPE_META[session.type] ?? TYPE_META.session;
                const track = session.trackId
                  ? getTrackById(session.trackId)
                  : null;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="group/session relative flex gap-3 pb-5 last:pb-0"
                  >
                    {/* Timeline rail */}
                    {i < day.sessions.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute right-[18px] top-9 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-[#E2E5EC] to-[#E2E5EC] group-last/session:bg-transparent"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.tint} ring-2 ring-offset-2 ring-offset-white ${meta.ring} transition-transform group-hover/session:scale-110`}
                    >
                      <meta.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-[#0B1B3D]/5 px-2.5 py-1 text-xs font-bold text-[#0B1B3D]"
                          dir="rtl"
                        >
                          <Clock className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                          {session.time}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full ${meta.bg} px-2.5 py-1 text-[10px] font-bold ${meta.tint}`}
                          dir="rtl"
                        >
                          <meta.icon className="h-3 w-3" aria-hidden />
                          {meta.label}
                        </span>
                      </div>
                      <h4
                        className="mt-1.5 text-sm font-semibold leading-snug text-[#0B1B3D] transition-colors group-hover/session:text-[#07152F]"
                        dir="rtl"
                      >
                        {session.title}
                      </h4>
                      {session.speaker && (
                        <p
                          className="mt-1 flex items-center gap-1 text-xs text-[#6B7280]"
                          dir="rtl"
                        >
                          <User className="h-3 w-3 text-[#9CA3AF]" aria-hidden />
                          {session.speaker}
                        </p>
                      )}
                      {track && (
                        <span
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F4ECD0] px-2.5 py-1 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37]"
                          dir="rtl"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-[#0B1B3D] text-[9px] font-extrabold text-[#D4AF37]">
                            {track.id}
                          </span>
                          {`المحور ${track.id}`}
                        </span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
