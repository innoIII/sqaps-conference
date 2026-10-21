"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, RefreshCw, ChevronDown, Info } from "lucide-react";

interface Usage {
  database: { bytes: number; limit: number; tables: { name: string; bytes: number; rows: number }[] } | Unavailable;
  neon:
    | {
        available: true;
        computeHours: number;
        computeLimit: number;
        transferBytes: number;
        transferLimit: number;
        periodEnd: string | null;
      }
    | Unavailable;
  vercel: { available: true; bytes: number; limit: number; deployments: number } | Unavailable;
  at: string;
}
interface Unavailable {
  available: false;
  error?: string;
}

const TABLE_NAMES: Record<string, string> = {
  session_reports: "التقارير",
  research_papers: "الأوراق البحثية",
  track_sessions: "الجلسات",
  questions: "أسئلة الجمهور",
  site_content: "نصوص الموقع",
  paper_files: "ملفات PDF المرفوعة",
  ai_evaluations: "تقييمات المفكّر",
  settings: "إعدادات الخريطة",
};

function fmtBytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Progress ring like Vercel's usage list: gold → amber → red as it fills. */
function Ring({ ratio }: { ratio: number | null }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const pct = ratio == null ? 0 : Math.min(1, Math.max(0, ratio));
  const color = ratio == null ? "#C9CDD6" : pct >= 0.9 ? "#B91C1C" : pct >= 0.7 ? "#D97706" : "#D4AF37";
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 -rotate-90" aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" stroke="#E2E5EC" strokeWidth="2.5" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(pct * c, pct > 0 ? 1.5 : 0)} ${c}`}
      />
    </svg>
  );
}

function Row({
  label,
  used,
  limit,
  ratio,
  hint,
}: {
  label: string;
  used?: string;
  limit: string;
  ratio: number | null;
  hint?: string;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Ring ratio={ratio} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#0B1B3D]" dir="rtl">
          {label}
        </p>
        {hint && (
          <p className="text-[11px] text-[#9CA3AF]" dir="rtl">
            {hint}
          </p>
        )}
      </div>
      <p className="shrink-0 text-xs font-semibold tabular-nums text-[#374151]" dir="ltr">
        {used ?? "—"} <span className="text-[#9CA3AF]">/ {limit}</span>
      </p>
    </li>
  );
}

/**
 * "الاستهلاك والتخزين" — the free-plan meters the conference depends on:
 * database storage (always), Neon compute hours / transfer (with NEON_API_KEY)
 * and Vercel Functions Storage (with VERCEL_API_TOKEN). See /api/admin/usage.
 */
export function UsageMeters() {
  const [data, setData] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTables, setShowTables] = useState(false);

  const load = useCallback((refresh = false) => {
    setLoading(true);
    setError(false);
    fetch(`/api/admin/usage${refresh ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // load() sets state from a fetch — expected for a data loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const db = data && !("available" in data.database) ? data.database : null;
  const neon = data?.neon && data.neon.available ? data.neon : null;
  const vercel = data?.vercel && data.vercel.available ? data.vercel : null;
  const needsKey = "يظهر بعد ربط المفتاح في Vercel";

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E5EC] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1B3D] to-[#07152F] text-[#D4AF37]">
            <Gauge className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
              الاستهلاك والتخزين
            </h2>
            <p className="text-[10px] text-[#9CA3AF]" dir="rtl">
              مقارنة بحدود الخطط المجانية{neon?.periodEnd ? ` · تتجدد في ${new Date(neon.periodEnd).toLocaleDateString("ar")}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E5EC] bg-white text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#F4ECD0]/40 disabled:opacity-50"
          aria-label="تحديث الاستهلاك"
          title="تحديث"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </div>

      {error ? (
        <p className="px-4 py-6 text-center text-xs text-[#B91C1C]" dir="rtl">
          تعذر قراءة الاستهلاك — حاول التحديث
        </p>
      ) : (
        <ul className="divide-y divide-[#F0F1F4]">
          <Row
            label="تخزين قاعدة البيانات"
            hint="التقارير والأسئلة والجلسات ونصوص الموقع"
            used={db ? fmtBytes(db.bytes) : undefined}
            limit="1 GB"
            ratio={db ? db.bytes / db.limit : null}
          />
          <Row
            label="ساعات حوسبة قاعدة البيانات"
            hint={neon ? "إذا نفدت تتوقف قاعدة البيانات حتى الشهر التالي" : needsKey + " (NEON_API_KEY)"}
            used={neon ? neon.computeHours.toFixed(1) : undefined}
            limit="100"
            ratio={neon ? neon.computeHours / neon.computeLimit : null}
          />
          <Row
            label="نقل بيانات قاعدة البيانات"
            hint={neon ? undefined : needsKey + " (NEON_API_KEY)"}
            used={neon ? fmtBytes(neon.transferBytes) : undefined}
            limit="5 GB"
            ratio={neon ? neon.transferBytes / neon.transferLimit : null}
          />
          <Row
            label="مساحة الدوال (Functions Storage)"
            hint={vercel ? `${vercel.deployments} نسخة نشر محفوظة` : needsKey + " (VERCEL_API_TOKEN)"}
            used={vercel ? fmtBytes(vercel.bytes) : undefined}
            limit="10 GB"
            ratio={vercel ? vercel.bytes / vercel.limit : null}
          />
        </ul>
      )}

      {db && (
        <div className="border-t border-[#E2E5EC]">
          <button
            type="button"
            onClick={() => setShowTables((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F5F6F8]"
            dir="rtl"
            aria-expanded={showTables}
          >
            <span className="inline-flex items-center gap-1">
              <Info className="h-3 w-3" aria-hidden />
              تفاصيل التخزين
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTables ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showTables && (
            <table className="w-full text-[11px]" dir="rtl">
              <tbody>
                {db.tables
                  .filter((t) => TABLE_NAMES[t.name])
                  .map((t) => (
                    <tr key={t.name} className="border-t border-[#F0F1F4]">
                      <td className="px-4 py-1.5 text-[#374151]">{TABLE_NAMES[t.name]}</td>
                      <td className="px-2 py-1.5 text-[#9CA3AF] tabular-nums">{t.rows.toLocaleString("ar")} سجل</td>
                      <td className="px-4 py-1.5 text-left tabular-nums text-[#374151]" dir="ltr">
                        {fmtBytes(t.bytes)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
