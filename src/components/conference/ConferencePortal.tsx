"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DEFAULT_TRACK_ID } from "@/lib/tracks";
import { useTrackContent } from "@/hooks/use-track-content";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SEARCH_INPUT_ID } from "@/lib/dom-ids";
import type { ContentFile } from "@/types";
import { TracksSection } from "./TracksSection";
import { ContentCard } from "./ContentCard";
import { MediaModal } from "./MediaModal";
import { BackToTop } from "./BackToTop";

export function ConferencePortal() {
  const [selectedId, setSelectedId] = useState<number>(DEFAULT_TRACK_ID);
  const [previewFile, setPreviewFile] = useState<ContentFile | null>(null);

  const { track, files, loading, error, reload } = useTrackContent(selectedId);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    // Smooth-scroll the tracks section into view so the change is visible.
    requestAnimationFrame(() => {
      document
        .getElementById("tracks")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handlePreview = useCallback((file: ContentFile) => {
    setPreviewFile(file);
  }, []);

  const handleClose = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const focusSearch = useCallback(() => {
    const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, []);

  useKeyboardShortcuts({
    onSelectTrack: handleSelect,
    trackCount: 5,
    onFocusSearch: focusSearch,
  });

  return (
    <div className="flex flex-col gap-10 pb-12 sm:gap-14">
      {/* Tracks selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        id="tracks"
        className="scroll-mt-20"
      >
        <TracksSection selectedId={selectedId} onSelect={handleSelect} />
      </motion.div>

      {/* Content panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ContentCard
          track={track}
          files={files}
          loading={loading}
          error={error}
          onRetry={reload}
          onPreview={handlePreview}
        />
      </motion.div>

      {/* Preview modal */}
      <MediaModal file={previewFile} onClose={handleClose} />

      {/* Floating back-to-top */}
      <BackToTop />

      {/* Keyboard hint (subtle, desktop-only) */}
      <div className="mx-auto hidden max-w-6xl px-6 text-center text-xs text-[#9CA3AF] md:block">
        <span dir="rtl">
          اختصارات لوحة المفاتيح: اضغط
          <kbd className="mx-1 rounded border border-[#E2E5EC] bg-[#F5F6F8] px-1.5 py-0.5 font-mono text-[10px] text-[#0B1B3D]">١</kbd>
          –
          <kbd className="mx-1 rounded border border-[#E2E5EC] bg-[#F5F6F8] px-1.5 py-0.5 font-mono text-[10px] text-[#0B1B3D]">٥</kbd>
          لتبديل المحاور، و
          <kbd className="mx-1 rounded border border-[#E2E5EC] bg-[#F5F6F8] px-1.5 py-0.5 font-mono text-[10px] text-[#0B1B3D]">/</kbd>
          للبحث، و
          <kbd className="mx-1 rounded border border-[#E2E5EC] bg-[#F5F6F8] px-1.5 py-0.5 font-mono text-[10px] text-[#0B1B3D]">Esc</kbd>
          لإغلاق المعاينة
        </span>
      </div>
    </div>
  );
}
