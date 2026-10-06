"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSiteContent } from "@/hooks/use-site-content";

type ContentMap = Record<string, string>;

interface SiteContentContextValue {
  content: ContentMap;
  loading: boolean;
  /** Get a content value by key, falling back to the provided default. */
  get: (key: string, fallback: string) => string;
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: {},
  loading: true,
  get: (_key, fallback) => fallback,
});

/**
 * Wraps the app so every component can read editable site content via
 * `useSiteContentValue()` without re-fetching.
 */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { content, loading } = useSiteContent();
  const get = (key: string, fallback: string) => content[key] ?? fallback;
  return (
    <SiteContentContext.Provider value={{ content, loading, get }}>
      {children}
    </SiteContentContext.Provider>
  );
}

/** Hook to read editable site content anywhere in the tree. */
export function useSiteContentValue() {
  return useContext(SiteContentContext);
}
