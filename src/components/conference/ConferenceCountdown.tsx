"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Hourglass } from "lucide-react";
import { useSiteContentValue } from "./SiteContentProvider";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * Conference Countdown — animated countdown to the conference start date.
 *
 * Reads the conference dates from the site content (DB-backed) and parses
 * the start date. Falls back to the static conferenceInfo.dates if no DB.
 *
 * If the conference has already started (or finished), shows a "live now"
 * or "ended" message instead of the countdown.
 *
 * Styling: premium navy gradient with gold accents, 4-unit flip-card style
 * countdown grid (days / hours / minutes / seconds).
 */
export function ConferenceCountdown() {
  const { get } = useSiteContentValue();

  // Build the target date from the conference dates string.
  // The default is "٣ – ٤ نوفمبر ٢٠٢٦" — we need to parse the END date.
  // We support multiple formats:
  //   - "٣ – ٤ نوفمبر ٢٠٢٦" (Arabic-Indic)
  //   - "3-4 November 2026" (English)
  //   - "November 3, 2026"
  //   - Any ISO-like date.
  const targetDate = useMemo(() => {
    const datesStr = get("conference.dates", conferenceInfo.dates);
    // Try to extract a year + month + day from the string.
    // Convert Arabic-Indic digits to Latin.
    const latinStr = datesStr.replace(/[٠-٩]/g, (d) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(d)),
    );

    // Look for a year (4 digits starting with 20).
    const yearMatch = latinStr.match(/20\d{2}/);
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[0], 10);

    // Look for a month name (Arabic or English).
    const months: Record<string, number> = {
      // English
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      // Arabic
      يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, مايو: 4, يونيو: 5,
      يوليو: 6, أغسطس: 7, سبتمبر: 8, أكتوبر: 9, نوفمبر: 10, ديسمبر: 11,
      // Short Arabic
      ينا: 0, فبر: 1, مار: 2, أبر: 3, ماي: 4, يون: 5,
      يول: 6, أغس: 7, سبت: 8, أكت: 9, نوف: 10, ديس: 11,
    };

    let month = -1;
    for (const [name, num] of Object.entries(months)) {
      if (latinStr.toLowerCase().includes(name)) {
        month = num;
        break;
      }
    }
    if (month === -1) return null;

    // Look for a day — take the LAST number in the range (the end date).
    // E.g. "3 - 4 November" → 4, "November 3" → 3.
    const dayMatches = latinStr.match(/\d{1,2}/g);
    if (!dayMatches || dayMatches.length === 0) return null;
    // The day number is the one that's NOT the year.
    const days = dayMatches
      .map((d) => parseInt(d, 10))
      .filter((d) => d !== year && d >= 1 && d <= 31);
    if (days.length === 0) return null;
    // Use the last day (end of conference) so the countdown reaches 0
    // at the start of the last day, then shows "ended".
    const day = days[days.length - 1];

    // Construct a Date at 09:00 local time on the start day.
    // (We use the FIRST day for the countdown target.)
    const startDay = days[0];
    return new Date(year, month, startDay, 9, 0, 0);
  }, [get]);

  // Start with `null` on the server + first client render, then set to
  // Date.now() in an effect. This avoids hydration mismatch (server time vs
  // client time differ by a few ms, causing the countdown digits to differ).
  const [now, setNow] = useState<number | null>(null);

  // Tick every second.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute the time difference (null until mounted on the client).
  const diff = targetDate && now !== null ? targetDate.getTime() - now : 0;
  const isPast = targetDate !== null && now !== null && diff <= 0;
  const isLive =
    targetDate !== null && now !== null && diff <= 0 && diff > -2 * 24 * 60 * 60 * 1000; // within 2 days after start
  const isReady = now !== null && targetDate !== null;

  const timeLeft = useMemo(() => {
    if (!targetDate || !isReady || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / (24 * 60 * 60)),
      hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
      minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
      seconds: totalSeconds % 60,
    };
  }, [targetDate, diff, isReady]);

  // Don't render if we couldn't parse a date.
  if (!targetDate) return null;

  const units = [
    { label: "يوم", value: timeLeft.days, max: 365 },
    { label: "ساعة", value: timeLeft.hours, max: 24 },
    { label: "دقيقة", value: timeLeft.minutes, max: 60 },
    { label: "ثانية", value: timeLeft.seconds, max: 60 },
  ];

  return (
    <section
      aria-label="العد التنازلي للمؤتمر"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0B1B3D] via-[#0B1B3D] to-[#07152F] shadow-2xl shadow-[#0B1B3D]/25"
      >
        {/* Decorative geometric pattern */}
        <div
          aria-hidden
          className="geometric-pattern pointer-events-none absolute inset-0 opacity-30"
        />
        {/* Radial gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 50% 100%, rgba(212,175,55,0.18), transparent 70%)",
          }}
        />

        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          {/* Heading */}
          <div className="mb-6 flex flex-col items-center text-center">
            <h2
              className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl"
              dir="rtl"
            >
              <CalendarClock className="h-5 w-5 text-[#D4AF37]" aria-hidden />
              {isLive
                ? "المؤتمر منعقد الآن"
                : isPast
                  ? "انتهى المؤتمر"
                  : "العد التنازلي لانعقاد المؤتمر"}
            </h2>
            <p className="mt-1.5 text-xs text-white/70 sm:text-sm" dir="rtl">
              {get("conference.dates", conferenceInfo.dates)} ·{" "}
              {get("conference.city", conferenceInfo.city)}
            </p>
          </div>

          {/* Countdown grid */}
          {!isPast && (
            <div
              className="mx-auto grid max-w-2xl grid-cols-4 gap-2 sm:gap-4"
              dir="rtl"
            >
              {units.map((u, idx) => (
                <motion.div
                  key={u.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="relative flex flex-col items-center"
                >
                  <div className="relative w-full overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-white/5 backdrop-blur-sm">
                    {/* Top gold accent */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent"
                    />
                    <div className="px-1 py-4 sm:py-6">
                      <span
                        className="block text-center font-mono text-2xl font-extrabold tabular-nums text-[#D4AF37] sm:text-4xl md:text-5xl"
                        dir="ltr"
                      >
                        {isReady ? String(u.value).padStart(2, "0") : "—"}
                      </span>
                    </div>
                    {/* Bottom divider */}
                    <span
                      aria-hidden
                      className="absolute inset-x-4 bottom-0 h-px bg-[#D4AF37]/20"
                    />
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/70 sm:text-xs" dir="rtl">
                    {u.label}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Live / past state */}
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center"
            >
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                <Hourglass className="relative h-7 w-7 text-green-400" aria-hidden />
              </span>
              <p className="text-base font-bold text-white sm:text-lg" dir="rtl">
                المؤتمر منعقد الآن
              </p>
              <p className="text-xs text-white/70" dir="rtl">
                نرحب بمشاركتكم في الفعاليات والجلسات العلمية
              </p>
            </motion.div>
          )}

          {isPast && !isLive && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
              <Hourglass className="h-10 w-10 text-white/40" aria-hidden />
              <p className="text-base font-bold text-white/80" dir="rtl">
                انتهى المؤتمر بنجاح
              </p>
              <p className="text-xs text-white/60" dir="rtl">
                شكرًا لجميع المشاركين والباحثين والحضور
              </p>
            </div>
          )}

          {/* Footer hint */}
          {!isPast && (
            <p className="mt-5 text-center text-[11px] text-white/50" dir="rtl">
              {get("conference.venue", conferenceInfo.venue)}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  );
}
