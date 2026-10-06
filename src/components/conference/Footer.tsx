"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Globe, Phone, ExternalLink } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";
import { WhatsAppModal } from "./WhatsAppModal";

/**
 * Footer
 *
 * Elegant minimal footer with branding, official contact details (website,
 * email as clickable hyperlinks, phone opens a WhatsApp compose popup) and
 * the copyright line. Sticks to the bottom of the viewport on short pages
 * (handled by the page wrapper using flex-col + mt-auto).
 */
export function Footer() {
  const { contact } = conferenceInfo;
  const [waPhone, setWaPhone] = useState<string | null>(null);

  return (
    <footer className="mt-auto border-t border-[#E2E5EC] bg-white">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-l from-[#0B1B3D] via-[#D4AF37] to-[#0B1B3D]" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-right">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" aria-hidden />
              <span className="text-sm font-bold text-[#0B1B3D]">
                {conferenceInfo.title}
              </span>
            </div>
            <p className="text-xs text-[#475569]" dir="rtl">
              {conferenceInfo.academy}
            </p>
            <p className="text-xs text-[#9CA3AF]" dir="rtl">
              {conferenceInfo.edition} · {conferenceInfo.dates}
            </p>
          </div>

          {/* Official contact details — clickable hyperlinks */}
          <div className="md:col-span-2">
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]"
              dir="rtl"
            >
              تواصل معنا
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Website */}
              <a
                href={contact.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2.5 transition-all hover:border-[#D4AF37]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                  <Globe className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] text-[#9CA3AF]">
                    الموقع الرسمي
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]">
                    <span className="truncate">{contact.website}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </span>
                </span>
              </a>

              {/* Email */}
              <a
                href={`mailto:${contact.email}`}
                className="group flex items-center gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2.5 transition-all hover:border-[#D4AF37]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] text-[#9CA3AF]">
                    البريد الإلكتروني
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#0B1B3D] group-hover:text-[#D4AF37]">
                    {contact.email}
                  </span>
                </span>
              </a>

              {/* Phone — opens contact popup (forwards to support via CallMeBot) */}
              <button
                type="button"
                onClick={() => setWaPhone(contact.phones[0])}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2.5 text-right transition-all hover:border-[#25D366]/50 hover:bg-white hover:shadow-sm"
                dir="rtl"
                title="تواصل مع الدعم الفني"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] text-[#9CA3AF]">
                    تواصل معنا
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#0B1B3D] group-hover:text-[#25D366]" dir="rtl">
                    الدعم الفني
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px bg-[#E2E5EC]" />

        {/* Copyright */}
        <p className="text-center text-xs text-[#475569]" dir="rtl">
          © 2026 {conferenceInfo.title} – {conferenceInfo.subtitle} · جميع
          الحقوق محفوظة
        </p>
      </div>

      {/* WhatsApp compose popup */}
      <WhatsAppModal phone={waPhone} onClose={() => setWaPhone(null)} />
    </footer>
  );
}
