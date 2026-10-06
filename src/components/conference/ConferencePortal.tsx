"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DEFAULT_TRACK_ID } from "@/lib/tracks";
import { useTrackContent } from "@/hooks/use-track-content";
import type { ContentFile } from "@/types";
import { TracksSection } from "./TracksSection";
import { ContentCard } from "./ContentCard";
import { MediaModal } from "./MediaModal";
import { BackToTop } from "./BackToTop";

/**
 * The interactive heart of the portal. Owns the selected track, the fetch
 * state for its files, and the currently-previewed file (modal).
 *
 * Flow: TracksSection (select) → useTrackContent (fetch) → ContentCard (show)
 *                                              ↓
 *                                  FileItem preview → MediaModal
 */
export function ConferencePortal() {
  const [selectedId, setSelectedId] = useState<number>(DEFAULT_TRACK_ID);
  const [previewFile, setPreviewFile] = useState<ContentFile | null>(null);

  const { track, files, loading, error, reload } = useTrackContent(selectedId);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handlePreview = useCallback((file: ContentFile) => {
    setPreviewFile(file);
  }, []);

  const handleClose = useCallback(() => {
    setPreviewFile(null);
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-12 sm:gap-14">
      {/* Tracks selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        id="tracks"
        className="scroll-mt-6"
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
    </div>
  );
}
