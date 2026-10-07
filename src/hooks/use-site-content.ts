"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetches all editable site content (key→value) from /api/site-content.
 * Returns the content map + loading state + a reload callback + a setContent
 * setter for optimistic in-memory updates.
 *
 * Components read individual keys via `content[key] ?? fallback`.
 */
export function useSiteContent() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/site-content", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        setContent(data ?? {});
      })
      .catch(() => {
        if (!active) return;
        setContent({});
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  return { content, loading, reload, setContent };
}
