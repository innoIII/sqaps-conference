"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useSiteContent } from "@/hooks/use-site-content";

type ContentMap = Record<string, string>;

interface SiteContentContextValue {
  content: ContentMap;
  loading: boolean;
  /** Get a content value by key, falling back to the provided default. */
  get: (key: string, fallback: string) => string;
  /** Force a re-fetch of the content (e.g. after the admin saves). */
  reload: () => void;
  /** Optimistically merge values into the in-memory content map (no fetch). */
  setMany: (entries: ContentMap) => void;
  /** Remove keys from the in-memory content map (no fetch). */
  deleteMany: (keys: string[]) => void;
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: {},
  loading: true,
  get: (_key, fallback) => fallback,
  reload: () => {},
  setMany: () => {},
  deleteMany: () => {},
});

/**
 * Wraps the app so every component can read editable site content via
 * `useSiteContentValue()` without re-fetching.
 */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { content, loading, reload, setContent } = useSiteContent();

  const get = useCallback(
    (key: string, fallback: string) => content[key] ?? fallback,
    [content],
  );

  const setMany = useCallback(
    (entries: ContentMap) => {
      setContent((prev) => ({ ...prev, ...entries }));
    },
    [setContent],
  );

  const deleteMany = useCallback(
    (keys: string[]) => {
      setContent((prev) => {
        const next = { ...prev };
        for (const k of keys) delete next[k];
        return next;
      });
    },
    [setContent],
  );

  return (
    <SiteContentContext.Provider
      value={{ content, loading, get, reload, setMany, deleteMany }}
    >
      {children}
    </SiteContentContext.Provider>
  );
}

/** Hook to read editable site content anywhere in the tree. */
export function useSiteContentValue() {
  return useContext(SiteContentContext);
}
