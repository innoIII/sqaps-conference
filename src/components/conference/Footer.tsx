"use client";

import { useState } from "react";
import {
  Mail,
  Globe,
  Phone,
  ExternalLink,
  MapPin,
  CalendarDays,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";
import { WhatsAppModal } from "./WhatsAppModal";
import { useSiteContentValue } from "./SiteContentProvider";

/**
 * Footer — enhanced premium footer with:
 *  - Branding block (logo, title, edition)
 *  - Quick navigation links (smooth scroll to sections)
 *  - Official contact details (clickable website/email + WhatsApp popup)
 *  - Conference meta (dates, venue, city)
 *  - Copyright line
 *
 * Sticks to the bottom of the viewport on short pages (handled by the
 * page wrapper using flex-col + mt-auto).
 */

const QUICK_LINKS = [
  { id: "about", label: "عن المؤتمر" },
  { id: "tracks", label: "المحاور" },
  { id: "schedule", label: "البرنامج" },
];

export function Footer() {
  const { get } = useSiteContentValue();
  const { contact } = conferenceInfo;
  const [waPhone, setWaPhone] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="mt-auto border-t border-[#E2E5EC] bg-white pb-20 sm:pb-24">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-l from-[#0B1B3D] via-[#D4AF37] to-[#0B1B3D]" />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Branding (wider) */}
          <div className="md:col-span-2 flex flex-col items-center gap-3 text-center md:items-start md:text-right">
            <div className="flex items-center gap-2.5">
              {/* Same two logos as the header: academy | conference */}
              <span className="flex shrink-0 items-center gap-2">
                <img src="/logo/academy-logo.webp" alt="أكاديمية السلطان قابوس لعلوم الشرطة" className="h-12 w-12 object-contain" loading="lazy" />
                <span className="h-8 w-px bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent" aria-hidden />
                <img src="/logo/conference-logo.webp" alt="شعار المؤتمر" className="h-12 w-12 object-contain" loading="lazy" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[#0B1B3D]" dir="rtl">
                  {get("conference.title", conferenceInfo.title)}
                </p>
                <p className="text-[11px] text-[#D4AF37] font-semibold" dir="rtl">
                  {get("conference.subtitle", conferenceInfo.subtitle)}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed" dir="rtl">
              {get("conference.academy", conferenceInfo.academy)}
            </p>
            <p className="text-[11px] text-[#9CA3AF]" dir="rtl">
              {get("conference.edition", conferenceInfo.edition)} · {get("conference.dates", conferenceInfo.dates)}
            </p>

            {/* Conference meta badges */}
            <div className="mt-1 flex flex-wrap justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F6F8] px-2.5 py-1 text-[10px] font-medium text-[#475569]" dir="rtl">
                <MapPin className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                {get("conference.city", conferenceInfo.city)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F6F8] px-2.5 py-1 text-[10px] font-medium text-[#475569]" dir="rtl">
                <CalendarDays className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                {get("conference.duration", conferenceInfo.duration)}
              </span>
            </div>
          </div>

          {/* Quick navigation */}
          <div>
            <h3
              className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]"
              dir="rtl"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              روابط سريعة
            </h3>
            <ul className="space-y-1.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(link.id)}
                    className="group inline-flex w-full items-center gap-1 text-right text-xs font-medium text-[#475569] transition-colors hover:text-[#D4AF37]"
                    dir="rtl"
                  >
                    <ChevronLeft className="h-3 w-3 text-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    <span className="flex-1">{link.label}</span>
                  </button>
                </li>
              ))}
              {/* Admin link */}
              <li>
                <a
                  href="/admin"
                  className="group inline-flex w-full items-center gap-1 text-right text-xs font-medium text-[#475569] transition-colors hover:text-[#D4AF37]"
                  dir="rtl"
                >
                  <ChevronLeft className="h-3 w-3 text-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  <span className="flex-1">لوحة الإدارة</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Official contact details — clickable */}
          <div>
            <h3
              className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]"
              dir="rtl"
            >
              <Mail className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              تواصل معنا
            </h3>
            <div className="space-y-2">
              {/* Website */}
              <a
                href={contact.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] px-2.5 py-2 transition hover:border-[#D4AF37]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] text-[#9CA3AF]">الموقع الرسمي</span>
                  <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]">
                    <span className="truncate">{contact.website}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </span>
                </span>
              </a>

              {/* Email */}
              <a
                href={`mailto:${contact.email}`}
                className="group flex items-center gap-2.5 rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] px-2.5 py-2 transition hover:border-[#D4AF37]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] text-[#9CA3AF]">البريد الإلكتروني</span>
                  <span className="block truncate text-[11px] font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]" dir="ltr">
                    {contact.email}
                  </span>
                </span>
              </a>

              {/* Phone — WhatsApp */}
              <button
                type="button"
                onClick={() => setWaPhone(contact.phones[0])}
                className="group flex w-full items-center gap-2.5 rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] px-2.5 py-2 text-right transition hover:border-[#25D366]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
                title="تواصل مع الدعم الفني"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] text-[#9CA3AF]">الدعم الفني</span>
                  <span className="block truncate text-[11px] font-semibold text-[#0B1B3D] group-hover:text-[#25D366]" dir="rtl">
                    تواصل عبر واتساب
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px bg-gradient-to-l from-transparent via-[#E2E5EC] to-transparent" />

        {/* Copyright */}
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-right">
          <p className="text-xs text-[#475569]" dir="rtl">
            © 2026 {get("conference.title", conferenceInfo.title)} – {get("conference.subtitle", conferenceInfo.subtitle)} · جميع الحقوق محفوظة
          </p>
          <p className="text-[10px] text-[#9CA3AF]" dir="rtl">
            صُمم بأيدي وطنية · أكاديمية السلطان قابوس لعلوم الشرطة
          </p>
        </div>
      </div>

      {/* WhatsApp compose popup */}
      <WhatsAppModal phone={waPhone} onClose={() => setWaPhone(null)} />
    </footer>
  );
}
