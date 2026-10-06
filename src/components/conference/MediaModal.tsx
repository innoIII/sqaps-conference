"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, EyeOff } from "lucide-react";
import { useEffect, useCallback } from "react";
import type { ContentFile } from "@/types";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { VideoViewer } from "./VideoViewer";
import { HtmlViewer } from "./HtmlViewer";
import { TextViewer } from "./TextViewer";
import { DocumentViewer } from "./DocumentViewer";

interface MediaModalProps {
  file: ContentFile | null;
  onClose: () => void;
}

/** Picks the right viewer component for the active file. */
function PreviewArea({ file }: { file: ContentFile }) {
  switch (file.type) {
    case "pdf":
      return <PdfViewer url={file.url} name={file.name} />;
    case "image":
      return <ImageViewer url={file.url} name={file.name} />;
    case "video":
      return <VideoViewer url={file.url} name={file.name} />;
    case "html":
      return <HtmlViewer url={file.url} name={file.name} />;
    case "text":
      return <TextViewer url={file.url} name={file.name} />;
    case "document":
      return <DocumentViewer url={file.url} name={file.name} />;
    default:
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4ECD0]">
            <EyeOff className="h-8 w-8 text-[#D4AF37]" />
          </span>
          <p className="text-base font-semibold text-[#0B1B3D]">
            لا يمكن معاينة هذا الملف مباشرة
          </p>
          <a
            href={file.url}
            download={file.name}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#07152F]"
          >
            <Download className="h-4 w-4" aria-hidden />
            تحميل الملف
          </a>
        </div>
      );
  }
}

/**
 * Full-screen modal with animated backdrop + scale/slide panel.
 * Closes on Escape, backdrop click, or close button. Locks body scroll while
 * open. Fully responsive — fills viewport on mobile, centered on desktop.
 */
export function MediaModal({ file, onClose }: MediaModalProps) {
  const open = file !== null;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, handleKey]);

  return (
    <AnimatePresence>
      {open && file && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={`معاينة ${file.name}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#07152F]/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[88vh]"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-4 py-3 text-white sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden h-2 w-2 shrink-0 rounded-full bg-[#D4AF37] sm:inline-block" />
                <h3
                  className="truncate text-sm font-semibold sm:text-base"
                  title={file.name}
                  dir="auto"
                >
                  {file.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.url}
                  download={file.name}
                  aria-label="تحميل الملف"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">تحميل</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-[#B91C1C] hover:border-[#B91C1C]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* Preview area */}
            <div className="min-h-0 flex-1 bg-[#F5F6F8]">
              <PreviewArea file={file} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
