"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackApiResponse, ApiErrorResponse, ContentFile, TrackInfo } from "@/types";

interface UseTrackContentResult {
  track: TrackInfo | null;
  files: ContentFile[];
  loading: boolean;
  error: ApiErrorResponse | null;
  reload: () => void;
}

/**
 * Fetches the files for a given track id from /api/tracks/[trackId].
 * Re-fetches whenever the id changes, supports manual retry, and is safe
 * against out-of-order responses (tracks the latest requested id).
 */
export function useTrackContent(trackId: number): UseTrackContentResult {
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorResponse | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqIdRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const currentReq = ++reqIdRef.current;
    // Resetting request status synchronously is the intended behavior for a
    // data-fetch effect (marks the new request as in-flight immediately).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch(`/api/tracks/${trackId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (currentReq !== reqIdRef.current) return; // stale response
        if (!res.ok) {
          setError(data as ApiErrorResponse);
          setTrack(null);
          setFiles([]);
        } else {
          const ok = data as TrackApiResponse;
          setTrack(ok.track);
          setFiles(ok.files);
        }
      })
      .catch(() => {
        if (currentReq !== reqIdRef.current) return;
        setError({
          error: "تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.",
          code: "SERVER_ERROR",
        });
        setTrack(null);
        setFiles([]);
      })
      .finally(() => {
        if (currentReq !== reqIdRef.current) return;
        setLoading(false);
      });
  }, [trackId, nonce]);

  return { track, files, loading, error, reload };
}
