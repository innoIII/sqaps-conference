"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  /** Select a track by numeric id (1..5). */
  onSelectTrack: (id: number) => void;
  /** Number of available tracks. */
  trackCount: number;
}

/**
 * Global keyboard shortcuts:
 *   - digits 1..9  → select track N (when not typing in an input)
 *   - "Escape" handled per-component (modal closes itself)
 *
 * Shortcuts are ignored while the user is typing in a form field so digits
 * typed into inputs don't switch tracks.
 */
export function useKeyboardShortcuts({
  onSelectTrack,
  trackCount,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      // Digits 1..9 select tracks — only when not typing.
      if (!isTyping && /^[1-9]$/.test(e.key)) {
        const id = Number(e.key);
        if (id >= 1 && id <= trackCount) {
          onSelectTrack(id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSelectTrack, trackCount]);
}
