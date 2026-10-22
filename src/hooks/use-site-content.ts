"use client";

import { useCallback, useEffect, useState } from "react";
import { fresh } from "@/lib/cache";

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

  // On mount: clear sessionStorage overrides so the fetch always gets
  // fresh DB values. The sessionStorage was causing stale data to persist
  // on the public site after admin edits.
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // Re-fetch when:
  //   1. The page regains focus (tab switch back from /admin)
  //   2. Another tab saved data (localStorage broadcast — instant, no flicker)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        setNonce((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisible);

    // Listen for data-updated broadcasts from other tabs (e.g. /admin saved).
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sqaps-data-updated") {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        setNonce((n) => n + 1);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const reload = useCallback(() => {
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
  // But ONLY if we're on the admin page (path includes /admin).
  // On public pages, we always want fresh DB values.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdmin = window.location.pathname.includes("/admin");
    if (!isAdmin) {
      // On public pages: don't persist to sessionStorage.
      // This ensures the next page load gets fresh DB values.
      return;
    }
    try {
      const hasKeys = Object.keys(content).length > 0;
      if (hasKeys) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [content]);

  useEffect(() => {
    let active = true;
    // Only show loading spinner on first load (not on silent re-fetches).
    if (Object.keys(content).length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
    }
    // Visitors share the CDN copy; the admin page always reads fresh (src/lib/cache.ts).
    const onAdmin = typeof window !== "undefined" && window.location.pathname.includes("/admin");
    fetch(`/api/site-content${onAdmin ? fresh() : ""}`, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as Record<string, string>;
        if (!active) return;
        // On public pages: always use API values (fresh from DB).
        // On admin: merge with optimistic overrides.
        const isAdmin = typeof window !== "undefined" && window.location.pathname.includes("/admin");
        if (isAdmin) {
          setContent((prev) => {
            const merged = { ...data };
            for (const [key, value] of Object.entries(prev)) {
              if (data[key] !== value) {
                merged[key] = value;
              }
            }
            return merged;
          });
        } else {
          setContent(data);
        }
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
