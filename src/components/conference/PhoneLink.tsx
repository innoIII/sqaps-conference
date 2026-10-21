import { Phone } from "lucide-react";

/** Keep only what a tel: URI accepts (digits and a leading +). */
function telHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

/**
 * A small tap-to-call phone number shown under a person's name.
 * Digits stay left-to-right inside the RTL layout.
 */
export function PhoneLink({
  phone,
  name,
  tone = "light",
}: {
  phone?: string;
  name?: string;
  /** "light" on white/grey cards, "muted" for secondary placement. */
  tone?: "light" | "muted";
}) {
  if (!phone?.trim()) return null;
  return (
    <a
      href={telHref(phone)}
      aria-label={name ? `الاتصال بـ ${name}: ${phone}` : `الاتصال: ${phone}`}
      className={[
        "inline-flex items-center gap-1 rounded-md text-[11px] font-semibold tabular-nums transition-colors",
        tone === "light"
          ? "text-[#8A6D1A] hover:text-[#0B1B3D]"
          : "text-[#6B7280] hover:text-[#0B1B3D]",
      ].join(" ")}
    >
      <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" aria-hidden />
      <span dir="ltr">{phone.trim()}</span>
    </a>
  );
}
