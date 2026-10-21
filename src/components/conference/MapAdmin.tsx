"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, MapPin, RefreshCw } from "lucide-react";

interface MapHall {
  id: string;
  ar: string;
  /** Whether the hall has been placed on a room of the map. */
  placed: boolean;
}

interface MapSession {
  trackId: number;
  title: string;
  time: string;
  hall: string | null;
}

/**
 * Admin "الخريطة" tab.
 *
 * Top: which hall each session is held in (set per session in the session
 * tab). Below: the /map page itself in organiser mode, where the admin places
 * every hall and service on the 3D map and saves it for all visitors.
 */
export function MapAdmin() {
  const [halls, setHalls] = useState<MapHall[]>([]);
  const [sessions, setSessions] = useState<MapSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [frameKey, setFrameKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/map-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHalls(d.halls ?? []);
        setSessions(d.sessions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // load() sets state from a fetch — expected for a data loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const hallName = (id: string | null) => halls.find((h) => h.id === id)?.ar;

  return (
    <div className="space-y-5">
      {/* Sessions → halls */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D]">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold" dir="rtl">
                أماكن الجلسات على الخريطة
              </h2>
              <p className="text-xs text-white/70" dir="rtl">
                اختر قاعة كل جلسة من تبويب «بيانات الجلسة» ← «القاعة على الخريطة»
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              load();
              setFrameKey((k) => k + 1);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"
            dir="rtl"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            تحديث
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" aria-hidden />
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E5EC]">
            {sessions.map((s) => {
              const name = hallName(s.hall);
              return (
                <li key={s.trackId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-xs font-extrabold text-[#D4AF37]">
                    {s.trackId}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0B1B3D]" dir="rtl" title={s.title}>
                      {s.title}
                    </p>
                    {s.time && (
                      <p className="text-[11px] text-[#9CA3AF]" dir="rtl">
                        {s.time}
                      </p>
                    )}
                  </div>
                  {name ? (
                    <a
                      href={`/map?session=${s.trackId}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 rounded-full bg-[#F4ECD0] px-3 py-1 text-[11px] font-bold text-[#0B1B3D] hover:bg-[#D4AF37]"
                      dir="rtl"
                    >
                      <MapPin className="h-3 w-3" aria-hidden />
                      {name}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    <span className="rounded-full bg-[#F5F6F8] px-3 py-1 text-[11px] font-bold text-[#9CA3AF]" dir="rtl">
                      لم تُحدَّد القاعة
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* The map in organiser mode */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
          <p className="text-xs text-[#374151]" dir="rtl">
            حدّد مكان كل قاعة وخدمة من زر الإعدادات (⚙) أعلى الخريطة، ثم اضغط «حفظ الإعدادات» — تظهر لكل الزوار فوراً.
          </p>
          <a
            href="/map?admin=1#organizer"
            target="_blank"
            rel="noopener"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B1B3D] px-3 text-xs font-bold text-[#D4AF37]"
            dir="rtl"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            فتح في نافذة كاملة
          </a>
        </div>
        <iframe
          key={frameKey}
          src="/map?admin=1#organizer"
          title="خريطة القاعات — وضع المنظّمين"
          className="block h-[78vh] min-h-[520px] w-full border-0"
          onLoad={() => load()}
        />
      </section>
    </div>
  );
}
