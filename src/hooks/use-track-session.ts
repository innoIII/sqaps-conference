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
 */
export function useTrackSession(trackId: number): UseTrackSessionResult {
  const [session, setSession] = useState<TrackSessionInfo | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const current = ++reqRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch(`/api/sessions/${trackId}`, { cache: "no-store" })
      .then(async (res) => {
        if (current !== reqRef.current) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as TrackSessionApiResponse;
        setSession(data.session);
        setPapers(data.papers ?? []);
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
