"use client";

import { useCallback, useEffect, useState } from "react";

/** sessionStorage key for optimistic content overrides. */
const STORAGE_KEY = "sqaps-content-overrides";

/**
 * Fetches all editable site content (key→value) from /api/site-content.
 * Returns the content map + loading state + a reload callback + a setContent
 * setter for optimistic in-memory updates.
 *
 * The hook merges 3 layers (in priority order):
 *   1. Optimistic overrides (in-memory + sessionStorage) — from admin edits.
 *   2. DB/API values (from /api/site-content).
 *   3. (the API itself falls back to static defaults if no DB).
 *
 * The optimistic overrides persist in sessionStorage so they survive page
 * navigation — this is critical for local dev (no DB) where the PUT is a
 * no-op. On Vercel with postgres, the PUT persists to DB so the API returns
 * the updated values; the sessionStorage overrides are a belt-and-suspenders
 * fallback that gets cleared on next session.
 */
export function useSiteContent() {
  // Start with the sessionStorage overrides so they're available immediately
  // (before the fetch completes) — prevents flicker on navigation.
  const [content, setContent] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    // Clear sessionStorage overrides so the fetch gets fresh DB values
    // (not stale optimistic overrides from a previous session).
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setContent({});
    setNonce((n) => n + 1);
  }, []);

  // Persist the content to sessionStorage whenever it changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Only persist non-empty overrides to avoid bloating sessionStorage.
      const hasKeys = Object.keys(content).length > 0;
      if (hasKeys) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // sessionStorage might be full or disabled — ignore.
    }
  }, [content]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/site-content", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as Record<string, string>;
        if (!active) return;
        // Merge: API values as the base, then apply any optimistic overrides
        // from the current state (which may have admin edits that haven't
        // persisted to the DB yet).
        setContent((prev) => {
          // Only keep overrides that differ from the API values.
          const merged = { ...data };
          for (const [key, value] of Object.entries(prev)) {
            // If the API now has the same value, drop the override.
            if (data[key] !== value) {
              merged[key] = value;
            }
          }
          return merged;
        });
      })
      .catch(() => {
        if (!active) return;
        // Keep the existing overrides (don't clear them on fetch failure).
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
