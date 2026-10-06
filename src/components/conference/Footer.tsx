import { ShieldCheck } from "lucide-react";

/**
 * Footer
 *
 * Minimal, elegant footer with the copyright line. Sticks to the bottom of
 * the viewport on short pages (handled by the page wrapper using flex-col +
 * mt-auto).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E2E5EC] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-right">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <ShieldCheck className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <span>© 2026 المؤتمر العلمي الدولي الثالث – جميع الحقوق محفوظة</span>
        </div>
        <p className="text-xs text-[#6B7280]/80">
          أكاديمية السلطان قابوس لعلوم الشرطة
        </p>
      </div>
    </footer>
  );
}
