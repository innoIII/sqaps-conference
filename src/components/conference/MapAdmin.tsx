"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, MapPin, RefreshCw } from "lucide-react";
import { fresh } from "@/lib/cache";

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
    fetch(`/api/map-config${fresh()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHalls(d.halls ?? []);
        setSessions(d.sessions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The map (iframe below) tells us when its settings were saved, so this list follows.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "map-saved") load();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  const [saving, setSaving] = useState<number | null>(null);
  /** Move a session to a hall (or off the map) — same field as «بيانات الجلسة» → «المكان (القاعة)». */
  const assign = async (trackId: number, hall: string) => {
    setSaving(trackId);
    setSessions((prev) => prev.map((s) => (s.trackId === trackId ? { ...s, hall: hall || null } : s)));
    try {
      const res = await fetch(`/api/sessions/${trackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: { mapHall: hall } }),
      });
      if (!res.ok) throw new Error();
      setFrameKey((k) => k + 1); // redraw the map with the session in its new hall
    } catch {
      load();
    } finally {
      setSaving(null);
    }
  };

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
                اختر قاعة كل جلسة هنا أو من «بيانات الجلسة» أو من إعدادات الخريطة ⚙ — كلها مرتبطة
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
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={s.hall ?? ""}
                      onChange={(e) => assign(s.trackId, e.target.value)}
                      disabled={saving === s.trackId}
                      aria-label={`قاعة ${s.title}`}
                      dir="rtl"
                      className={`h-9 rounded-lg border px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-50 ${
                        name ? "border-[#D4AF37]/50 bg-[#F4ECD0] text-[#0B1B3D]" : "border-[#E2E5EC] bg-[#F5F6F8] text-[#9CA3AF]"
                      }`}
                    >
                      <option value="">لم تُحدَّد القاعة</option>
                      {halls.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.ar}
                        </option>
                      ))}
                    </select>
                    {name && (
                      <a
                        href={`/map?session=${s.trackId}`}
                        target="_blank"
                        rel="noopener"
                        aria-label={`عرض ${s.title} على الخريطة`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E5EC] text-[#8A6D1A] hover:bg-[#F4ECD0]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
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
