"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileImage,
  FileVideo,
  FileCode,
  FileType2,
  Eye,
  Download,
} from "lucide-react";
import type { ContentFile } from "@/types";
import { getFileTypeLabel, formatFileSize } from "@/lib/fileTypes";

interface FileItemProps {
  file: ContentFile;
  onPreview: (file: ContentFile) => void;
}

/** Pick a Lucide icon + tint color for a given file type. */
function getIconForType(type: ContentFile["type"]) {
  switch (type) {
    case "pdf":
      return { Icon: FileText, tint: "text-[#B91C1C]", bg: "bg-red-50" };
    case "image":
      return { Icon: FileImage, tint: "text-[#0B1B3D]", bg: "bg-blue-50" };
    case "video":
      return { Icon: FileVideo, tint: "text-[#7C3AED]", bg: "bg-violet-50" };
    case "html":
      return { Icon: FileCode, tint: "text-[#0EA5E9]", bg: "bg-cyan-50" };
    case "text":
      return { Icon: FileText, tint: "text-[#6B7280]", bg: "bg-gray-50" };
    default:
      return { Icon: FileType2, tint: "text-[#6B7280]", bg: "bg-gray-50" };
  }
}

/**
 * A single file card: icon, name, meta (type • size) + معاينة / تحميل buttons.
 * Large touch targets (>= 44px) for tablet use.
 */
export function FileItem({ file, onPreview }: FileItemProps) {
  const { Icon, tint, bg } = getIconForType(file.type);
  const isPreviewable = file.type !== "unknown";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="group flex flex-col gap-3 rounded-2xl border border-[#E2E5EC] bg-white p-4 transition-all duration-200 hover:border-[#D4AF37]/50 hover:shadow-md"
    >
      {/* Top: icon + name + meta */}
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}
          aria-hidden
        >
          <Icon className={`h-5 w-5 ${tint}`} />
        </span>
        <div className="min-w-0 flex-1">
          <h4
            className="truncate text-sm font-semibold text-[#0B1B3D]"
            title={file.name}
            dir="auto"
          >
            {file.name}
          </h4>
          <p className="mt-0.5 text-xs text-[#6B7280]" dir="rtl">
            {getFileTypeLabel(file.type)}
            <span className="mx-1.5 text-[#E2E5EC]">•</span>
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onPreview(file)}
          disabled={!isPreviewable}
          aria-label={`معاينة ${file.name}`}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0B1B3D] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#07152F] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eye className="h-4 w-4" aria-hidden />
          معاينة
        </button>
        <a
          href={file.url}
          download={file.name}
          aria-label={`تحميل ${file.name}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0] px-3 text-sm font-semibold text-[#0B1B3D] transition-colors hover:bg-[#D4AF37] hover:text-[#0B1B3D]"
        >
          <Download className="h-4 w-4" aria-hidden />
          تحميل
        </a>
      </div>
    </motion.div>
  );
}
