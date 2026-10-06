"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileImage,
  FileVideo,
  FileCode,
  FileType2,
  FileSpreadsheet,
  Presentation,
  Eye,
  Download,
  Share2,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { ContentFile } from "@/types";
import { getFileTypeLabel, formatFileSize } from "@/lib/fileTypes";

interface FileItemProps {
  file: ContentFile;
  onPreview: (file: ContentFile) => void;
}

/** Pick a Lucide icon + tint color for a given file type + extension. */
function getIconForType(type: ContentFile["type"], extension: string) {
  switch (type) {
    case "pdf":
      return { Icon: FileText, tint: "text-[#B91C1C]", bg: "bg-red-50", chip: "bg-red-100 text-[#B91C1C]" };
    case "image":
      return { Icon: FileImage, tint: "text-[#0B1B3D]", bg: "bg-blue-50", chip: "bg-blue-100 text-[#1E3A5F]" };
    case "video":
      return { Icon: FileVideo, tint: "text-[#6D28D9]", bg: "bg-violet-50", chip: "bg-violet-100 text-[#6D28D9]" };
    case "html":
      return { Icon: FileCode, tint: "text-[#0369A1]", bg: "bg-cyan-50", chip: "bg-cyan-100 text-[#0369A1]" };
    case "text":
      return { Icon: FileText, tint: "text-[#475569]", bg: "bg-slate-50", chip: "bg-slate-100 text-[#475569]" };
    case "document": {
      // Word / PowerPoint / Excel get distinct icons + brand-tinted colors.
      if ([".ppt", ".pptx", ".pps"].includes(extension)) {
        return { Icon: Presentation, tint: "text-[#C2410C]", bg: "bg-orange-50", chip: "bg-orange-100 text-[#C2410C]" };
      }
      if ([".xls", ".xlsx", ".ods"].includes(extension)) {
        return { Icon: FileSpreadsheet, tint: "text-[#166534]", bg: "bg-green-50", chip: "bg-green-100 text-[#166534]" };
      }
      // .doc/.docx/.rtf/.odt → Word
      return { Icon: FileText, tint: "text-[#1D4ED8]", bg: "bg-blue-50", chip: "bg-blue-100 text-[#1D4ED8]" };
    }
    default:
      return { Icon: FileType2, tint: "text-[#6B7280]", bg: "bg-gray-50", chip: "bg-gray-100 text-[#6B7280]" };
  }
}

/**
 * A single file card: icon, name, meta (type • size) + معاينة / تحميل buttons.
 * Large touch targets (>= 44px) for tablet use. Hover lift + gold accent border.
 */
export function FileItem({ file, onPreview }: FileItemProps) {
  const { Icon, tint, bg, chip } = getIconForType(file.type, file.extension);
  const isPreviewable = file.type !== "unknown";
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const absoluteUrl = `${window.location.origin}${file.url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: file.name,
          text: file.name,
          url: absoluteUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user dismissed share dialog or clipboard unavailable — silent
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white p-4 shadow-sm transition-all duration-200 hover:border-[#D4AF37]/60 hover:shadow-lg hover:shadow-[#0B1B3D]/8"
    >
      {/* Gold top accent on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-right scale-x-0 bg-gradient-to-l from-[#D4AF37] to-[#E6C869] transition-transform duration-300 group-hover:scale-x-100"
      />

      {/* Top: icon + name + meta */}
      <div className="flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg} transition-transform duration-200 group-hover:scale-105`}
          aria-hidden
        >
          <Icon className={`h-5 w-5 ${tint}`} />
        </span>
        <div className="min-w-0 flex-1">
          <h4
            className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B1B3D]"
            title={file.name}
            dir="auto"
          >
            {file.name}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${chip}`}
              dir="rtl"
            >
              {getFileTypeLabel(file.type)}
            </span>
            <span className="text-[11px] text-[#64748B]" dir="rtl">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onPreview(file)}
          disabled={!isPreviewable}
          aria-label={`معاينة ${file.name}`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0B1B3D] px-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#07152F] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eye className="h-4 w-4" aria-hidden />
          معاينة
        </button>
        <a
          href={file.url}
          download={file.name}
          aria-label={`تحميل ${file.name}`}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0] px-3 text-sm font-bold text-[#0B1B3D] transition-all hover:bg-[#D4AF37] hover:shadow-sm"
        >
          <Download className="h-4 w-4" aria-hidden />
          تحميل
        </a>
        <button
          type="button"
          onClick={handleShare}
          aria-label={copied ? "تم نسخ الرابط" : `مشاركة ${file.name}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E5EC] bg-white text-[#6B7280] transition-all hover:border-[#D4AF37]/50 hover:text-[#0B1B3D]"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" aria-hidden />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </motion.div>
  );
}
