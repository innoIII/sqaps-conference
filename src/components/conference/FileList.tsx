"use client";

import { AnimatePresence } from "framer-motion";
import type { ContentFile } from "@/types";
import { FileItem } from "./FileItem";

interface FileListProps {
  files: ContentFile[];
  onPreview: (file: ContentFile) => void;
}

/**
 * Responsive grid of file cards with enter/exit animations.
 * 1 col (mobile) → 2 (sm) → 3 (lg).
 */
export function FileList({ files, onPreview }: FileListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <FileItem key={file.url} file={file} onPreview={onPreview} />
        ))}
      </AnimatePresence>
    </div>
  );
}
