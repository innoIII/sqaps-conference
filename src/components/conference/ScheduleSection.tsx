"use client";

import { motion } from "framer-motion";
import {
  CalendarRange,
  Presentation,
  Coffee,
  MessagesSquare,
  Award,
} from "lucide-react";
import { schedule, type ScheduleDay } from "@/lib/conference-info";
import { getTrackById } from "@/lib/tracks";
import { SectionHeading } from "./SectionHeading";
import { TrackIcon } from "./TrackIcon";
import { useSiteContentValue } from "./SiteContentProvider";

const TYPE_META: Record<
  ScheduleDay["sessions"][number]["type"],
  { icon: typeof Presentation; label: string; tint: string; bg: string; bar: string }
> = {
  keynote: {
    icon: Award,
    label: "كلمة رئيسية",
    tint: "text-[#D4AF37]",
    bg: "bg-[#0B1B3D]",
    bar: "bg-[#D4AF37]",
  },
  session: {
    icon: Presentation,
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
    icon: MessagesSquare,
    label: "ندوة حوارية",
    tint: "text-[#0B1B3D]",
    bg: "bg-[#E0E7FF]",
    bar: "bg-[#0B1B3D]",
  },
};

/**
 * Conference program — a 2-day timeline with session types color-coded.
 * Each session links back to its track when applicable.
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
                const meta = TYPE_META[session.type] ?? TYPE_META.session;
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
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F4ECD0] px-2 py-0.5 text-[11px] font-semibold text-[#0B1B3D]"
                          dir="rtl"
                        >
                          <TrackIcon
                            icon={track.icon}
                            iconClassName="h-3 w-3 text-[#0B1B3D]"
                          />
                          {`المحور ${track.id}`}
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
