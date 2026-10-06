"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  MapPin,
  CalendarDays,
  Clock,
  Quote,
  Globe,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * About the conference — a premium two-column section:
 *  - Right (RTL first): heading + intro paragraphs + pull-quote
 *  - Left: an info card with dates / venue / duration + official contact links
 */
export function AboutSection() {
  const facts = [
    { icon: CalendarDays, label: "تاريخ الانعقاد", value: conferenceInfo.dates },
    { icon: Clock, label: "المدة", value: conferenceInfo.duration },
    { icon: MapPin, label: "المكان", value: conferenceInfo.venue },
  ];
  const { contact } = conferenceInfo;

  return (
    <section
      aria-labelledby="about-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
        {/* Intro text — spans 3 cols on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-3"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37] shadow-sm">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                id="about-heading"
                className="text-xl font-bold text-[#0B1B3D] sm:text-2xl"
              >
                عن المؤتمر
              </h2>
              <p className="text-xs text-[#6B7280] sm:text-sm">
                رؤية المؤتمر وأهدافه ومحاوره
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {conferenceInfo.about.map((para, i) => (
              <p
                key={i}
                className="text-sm leading-[2] text-[#374151] sm:text-base sm:leading-[2]"
                dir="rtl"
              >
                {para}
              </p>
            ))}
          </div>

          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 flex gap-3 rounded-2xl border-r-4 border-[#D4AF37] bg-[#F4ECD0]/40 p-4 sm:p-5"
          >
            <Quote className="h-6 w-6 shrink-0 text-[#D4AF37]" aria-hidden />
            <p
              className="text-sm font-semibold leading-relaxed text-[#0B1B3D] sm:text-base"
              dir="rtl"
            >
              {conferenceInfo.tagline}
            </p>
          </motion.blockquote>
        </motion.div>

        {/* Info card — spans 2 cols on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-lg shadow-[#0B1B3D]/5">
            <div className="bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 sm:px-6">
              <h3 className="text-base font-bold text-white sm:text-lg" dir="rtl">
                تفاصيل الانعقاد
              </h3>
              <p className="text-xs text-white/70" dir="rtl">
                معلومات المؤتمر الأساسية
              </p>
            </div>
            <ul className="divide-y divide-[#E2E5EC]">
              {facts.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4ECD0] text-[#0B1B3D]">
                    <f.icon className="h-5 w-5 text-[#D4AF37]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#6B7280]" dir="rtl">
                      {f.label}
                    </p>
                    <p
                      className="truncate text-sm font-semibold text-[#0B1B3D] sm:text-base"
                      dir="rtl"
                      title={f.value}
                    >
                      {f.value}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Official contact links */}
            <div className="border-t border-[#E2E5EC] bg-[#F5F6F8] px-5 py-4 sm:px-6">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]"
                dir="rtl"
              >
                تواصل معنا
              </p>
              <div className="space-y-2">
                {/* Website */}
                <a
                  href={contact.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg bg-white px-3 py-2 transition-all hover:shadow-sm"
                  dir="rtl"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                    <Globe className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-[#9CA3AF]">
                      الموقع الرسمي
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]">
                      <span className="truncate" dir="ltr">
                        {contact.website}
                      </span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  </span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${contact.email}`}
                  className="group flex items-center gap-3 rounded-lg bg-white px-3 py-2 transition-all hover:shadow-sm"
                  dir="rtl"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-[#9CA3AF]">
                      البريد الإلكتروني
                    </span>
                    <span
                      className="block truncate text-xs font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]"
                      dir="ltr"
                    >
                      {contact.email}
                    </span>
                  </span>
                </a>

                {/* Phones */}
                <a
                  href={`tel:${contact.phones[0]}`}
                  className="group flex items-center gap-3 rounded-lg bg-white px-3 py-2 transition-all hover:shadow-sm"
                  dir="rtl"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                    <Phone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-[#9CA3AF]">
                      الهاتف
                    </span>
                    <span
                      className="block truncate text-xs font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]"
                      dir="ltr"
                    >
                      {contact.phones.join(" – ")}
                    </span>
                  </span>
                </a>
              </div>
            </div>

            <div className="border-t border-[#E2E5EC] bg-white px-5 py-3 sm:px-6">
              <p className="text-center text-xs text-[#6B7280]" dir="rtl">
                {conferenceInfo.edition} · {conferenceInfo.academy}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
