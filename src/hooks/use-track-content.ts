"use client";

import { useMemo } from "react";
import { getTrackById } from "@/lib/tracks";
import type { ApiErrorResponse, TrackInfo } from "@/types";

interface UseTrackContentResult {
  track: TrackInfo | null;
  loading: boolean;
  error: ApiErrorResponse | null;
  reload: () => void;
}

const noop = () => {};

/**
 * Resolves the header info (id / default title / subtitle) for a track.
 *
 * Track titles shown to visitors come from site content (editable in the
 * admin panel); this only supplies the defaults, so it is resolved locally —
 * no network request.
 */
export function useTrackContent(trackId: number): UseTrackContentResult {
  return useMemo(() => {
    const t = getTrackById(trackId);
    return {
      track: t ? { id: t.id, title: t.title, subtitle: t.subtitle } : null,
      loading: false,
      error: t ? null : { error: "المحور غير موجود", code: "INVALID_TRACK" },
      reload: noop,
    };
  }, [trackId]);
}
