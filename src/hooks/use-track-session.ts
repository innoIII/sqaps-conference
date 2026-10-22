"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TrackSessionInfo,
  ResearchPaper,
  TrackSessionApiResponse,
} from "@/types";

interface UseTrackSessionResult {
  session: TrackSessionInfo | null;
  papers: ResearchPaper[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches the session header + research papers for a track.
 * Gracefully handles missing DB (returns empty defaults).
 *
 * Auto-refreshes when:
 *   - trackId changes
 *   - the page regains focus (visibilitychange) — so admin edits show up
 *   - manual reload() is called
 */
export function useTrackSession(trackId: number): UseTrackSessionResult {
  const [session, setSession] = useState<TrackSessionInfo | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Re-fetch when:
  //   1. The page regains focus (tab switch back from /admin)
  //   2. Another tab saved data (localStorage broadcast — instant, no flicker)
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        setNonce((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisible);

    // Listen for data-updated broadcasts from other tabs (e.g. /admin saved).
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sqaps-data-updated") {
        setNonce((n) => n + 1);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Track whether we've ever loaded successfully (to decide loading spinner).
  // Using a ref avoids re-triggering the effect when session is set.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const current = ++reqRef.current;
    if (!hasLoadedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
    }
    setError(null);

    // No cache-busting: visitors share the CDN copy (see src/lib/cache.ts).
    const url = `/api/sessions/${trackId}`;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (current !== reqRef.current) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as TrackSessionApiResponse;
        setSession(data.session);
        setPapers(data.papers ?? []);
        hasLoadedRef.current = true;
      })
      .catch(() => {
        if (current !== reqRef.current) return;
        setError("تعذر تحميل بيانات الجلسة");
        setSession({ trackId });
        setPapers([]);
      })
      .finally(() => {
        if (current !== reqRef.current) return;
        setLoading(false);
      });
  }, [trackId, nonce]);

  return { session, papers, loading, error, reload };
}
