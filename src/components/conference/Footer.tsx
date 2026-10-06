import { ShieldCheck, Mail, Globe, Phone } from "lucide-react";
import { conferenceInfo } from "@/lib/conference-info";

/**
 * Footer
 *
 * Elegant minimal footer with the copyright line + contact icons.
 * Sticks to the bottom of the viewport on short pages (handled by the page
 * wrapper using flex-col + mt-auto).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E2E5EC] bg-white">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-l from-[#0B1B3D] via-[#D4AF37] to-[#0B1B3D]" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:justify-between md:text-right">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" aria-hidden />
              <span className="text-sm font-bold text-[#0B1B3D]">
                {conferenceInfo.title}
              </span>
            </div>
            <p className="text-xs text-[#475569]" dir="rtl">
              {conferenceInfo.academy}
            </p>
          </div>

          {/* Contact icons */}
          <div className="flex items-center gap-3">
            {[
              { icon: Mail, label: "البريد الإلكتروني" },
              { icon: Globe, label: "الموقع الإلكتروني" },
              { icon: Phone, label: "الهاتف" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                title={label}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] text-[#6B7280] transition-colors hover:border-[#D4AF37]/50 hover:text-[#0B1B3D]"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ))}
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
    </footer>
  );
}
