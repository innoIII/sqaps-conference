import type { FileType } from "@/types";

/** Extension -> FileType lookup table (lowercase, with leading dot). */
const EXTENSION_MAP: Record<string, FileType> = {
  ".pdf": "pdf",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".gif": "image",
  ".svg": "image",
  ".bmp": "image",
  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",
  ".ogv": "video",
  ".html": "html",
  ".htm": "html",
  ".txt": "text",
  ".md": "text",
  ".csv": "text",
  ".json": "text",
};

/**
 * Detect the preview category of a file from its name.
 * Returns `unknown` for anything we cannot preview inline.
 */
export function getFileType(filename: string): FileType {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex === -1) return "unknown";
  const ext = lower.slice(dotIndex);
  return EXTENSION_MAP[ext] ?? "unknown";
}

/** Extract the lowercase extension (including the dot) from a filename. */
export function getExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  return dotIndex === -1 ? "" : lower.slice(dotIndex);
}

/** Human-readable Arabic label for a file type. */
export function getFileTypeLabel(type: FileType): string {
  switch (type) {
    case "pdf":
      return "ملف PDF";
    case "image":
      return "صورة";
    case "video":
      return "فيديو";
    case "html":
      return "صفحة ويب";
    case "text":
      return "نص";
    default:
      return "ملف";
  }
}

/** Format a byte count into a compact Arabic-friendly string. */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "—";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
