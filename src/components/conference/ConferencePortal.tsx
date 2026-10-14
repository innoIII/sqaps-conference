"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DEFAULT_TRACK_ID, tracks as staticTracks } from "@/lib/tracks";
import { useTrackContent } from "@/hooks/use-track-content";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { ContentFile } from "@/types";
import { TracksSection } from "./TracksSection";
import { ContentCard } from "./ContentCard";
import { MediaModal } from "./MediaModal";
import { BackToTop } from "./BackToTop";
import { QuestionsButton } from "./QuestionsButton";
import { useSiteContentValue } from "./SiteContentProvider";

export function ConferencePortal() {
  const [selectedId, setSelectedId] = useState<number>(DEFAULT_TRACK_ID);
  const [previewFile, setPreviewFile] = useState<ContentFile | null>(null);

  const { get } = useSiteContentValue();
  const trackCount = Math.max(
    1,
    parseInt(get("tracks.count", String(staticTracks.length)), 10) ||
      staticTracks.length,
  );

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

  useKeyboardShortcuts({
    onSelectTrack: handleSelect,
    trackCount,
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

      {/* Floating buttons */}
      <BackToTop />
      <QuestionsButton trackId={selectedId} />
    </div>
  );
}
