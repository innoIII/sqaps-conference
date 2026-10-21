"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { fresh } from "@/lib/cache";

/**
 * /admin/qr — printable door signs for the hall guide (protected like /admin).
 *
 * One A5-sized card per conference hall (QR → /map?from=<hall>: the map opens
 * with the visitor standing at that hall's door) and per main entrance
 * (QR → /map#<entrance>). Two cards per A4 page.
 */

interface Hall {
  id: string;
  ar: string;
  placed: boolean;
}
interface Session {
  trackId: number;
  title: string;
  time: string;
  hall: string | null;
}

// Main entrances of the map (public/map/index.html → ENTRANCES).
const ENTRANCES = [
  { id: "central", ar: "المدخل الرئيسي – القاعة الوسطى" },
  { id: "main", ar: "مدخل الجناح الأيسر" },
  { id: "main-east", ar: "مدخل الجناح الأيمن" },
  { id: "west-front", ar: "مدخل الجناح الأيسر الأمامي" },
  { id: "east-front", ar: "مدخل الجناح الأيمن الأمامي" },
  { id: "students", ar: "مدخل الطلاب" },
  { id: "lobby-s", ar: "مدخل الردهة الوسطى (الحديقة)" },
];

const short = (title: string) => title.split(/[:：]/)[0].trim() || title;

function Card({
  title,
  url,
  sessions,
  kind,
}: {
  title: string;
  url: string;
  sessions?: Session[];
  kind: "hall" | "entrance";
}) {
  return (
    <article className="qr-card flex flex-col overflow-hidden rounded-2xl border-2 border-[#0B1B3D] bg-white" dir="rtl">
      <header className="flex items-center gap-3 bg-[#0B1B3D] px-5 py-3 text-white" style={{ borderBottom: "4px solid #D4AF37" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- print sheet, plain <img> keeps the logos crisp */}
        <img src="/logo/academy-logo.webp" alt="" className="h-12 w-12 object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/conference-logo.webp" alt="" className="h-12 w-12 object-contain" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#D4AF37]">المؤتمر العلمي الدولي الثالث</p>
          <p className="text-lg font-extrabold">دليل القاعات</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-4 text-center">
        <p className="text-[11px] font-bold text-[#8A6D1A]">{kind === "hall" ? "أنت عند باب" : "أنت عند"}</p>
        <h2 className="text-3xl font-extrabold leading-tight text-[#0B1B3D]">{title}</h2>
        <div className="rounded-xl border-2 border-[#D4AF37] bg-white p-2">
          <QRCodeSVG value={url} size={210} level="M" marginSize={1} fgColor="#0B1B3D" />
        </div>
        <p className="text-sm font-bold text-[#0B1B3D]">امسح الرمز بكاميرا الجوال لتعرف طريقك إلى أي قاعة أو خدمة</p>
        {kind === "hall" && sessions && sessions.length > 0 && (
          <div className="w-full rounded-xl bg-[#F4ECD0] px-4 py-2 text-right">
            <p className="mb-1 text-[11px] font-bold text-[#8A6D1A]">الجلسات في هذه القاعة</p>
            {sessions.map((s) => (
              <p key={s.trackId} className="text-xs font-semibold text-[#0B1B3D]">
                {short(s.title)}
                {s.time ? <span className="font-normal text-[#374151]"> · <span dir="ltr">{s.time}</span></span> : null}
              </p>
            ))}
          </div>
        )}
      </div>
      <footer className="px-5 pb-3 text-center text-[10px] text-[#6B7280]" dir="ltr">
        {url.replace(/^https?:\/\//, "")}
      </footer>
    </article>
  );
}

export default function QrSignsPage() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHalls, setShowHalls] = useState(true);
  const [showEntrances, setShowEntrances] = useState(true);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://sqaps-conference.vercel.app",
  );

  useEffect(() => {
    fetch(`/api/map-config${fresh()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHalls(d.halls ?? []);
        setSessions(d.sessions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => {
    const list: { key: string; title: string; url: string; kind: "hall" | "entrance"; sessions?: Session[] }[] = [];
    if (showHalls)
      for (const h of halls.filter((x) => x.placed))
        list.push({ key: `h-${h.id}`, title: h.ar, url: `${origin}/map?from=${encodeURIComponent(h.id)}`, kind: "hall", sessions: sessions.filter((s) => s.hall === h.id) });
    if (showEntrances)
      for (const e of ENTRANCES) list.push({ key: `e-${e.id}`, title: e.ar, url: `${origin}/map#${e.id}`, kind: "entrance" });
    return list;
  }, [halls, sessions, origin, showHalls, showEntrances]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .qr-sheet { display: grid; grid-template-columns: 1fr; gap: 8mm; padding: 0; }
          .qr-card { height: 133mm; break-inside: avoid; page-break-inside: avoid; }
          .qr-card:nth-child(2n) { break-after: page; page-break-after: always; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="sticky top-0 z-10 border-b border-[#E2E5EC] bg-white/95 px-4 py-3 backdrop-blur print:hidden" dir="rtl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <a href="/admin" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E2E5EC] px-3 text-sm font-bold text-[#0B1B3D]">
            <ArrowRight className="h-4 w-4" aria-hidden />
            لوحة الإدارة
          </a>
          <h1 className="text-base font-extrabold text-[#0B1B3D]">لوحات QR للأبواب والمداخل</h1>
          <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1B3D]">
            <input type="checkbox" checked={showHalls} onChange={(e) => setShowHalls(e.target.checked)} />
            القاعات
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1B3D]">
            <input type="checkbox" checked={showEntrances} onChange={(e) => setShowEntrances(e.target.checked)} />
            المداخل
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || cards.length === 0}
            className="ms-auto inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-bold text-[#D4AF37] disabled:opacity-50"
          >
            <Printer className="h-4 w-4" aria-hidden />
            طباعة ({cards.length})
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-xs text-[#6B7280]">
          ألصق لوحة كل قاعة بجانب بابها، ولوحات المداخل عند الأبواب الخارجية. عند المسح تفتح الخريطة والزائر عند هذا الباب، فيختار وجهته ويظهر له المسار. لوحتان في كل صفحة A4.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" aria-hidden />
        </div>
      ) : (
        <div className="qr-sheet mx-auto grid max-w-5xl grid-cols-1 gap-5 p-5 sm:grid-cols-2">
          {cards.map((c) => (
            <Card key={c.key} title={c.title} url={c.url} kind={c.kind} sessions={c.sessions} />
          ))}
        </div>
      )}
    </div>
  );
}
