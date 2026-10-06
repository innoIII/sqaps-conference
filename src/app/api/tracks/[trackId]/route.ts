import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { tracks, getTrackById, validTrackIds } from "@/lib/tracks";
import { getFileType, getExtension } from "@/lib/fileTypes";
import type {
  TrackApiResponse,
  ApiErrorResponse,
  ContentFile,
} from "@/types";

/**
 * The directory that holds all track content folders.
 * Resolves to <project-root>/public/content
 */
const CONTENT_ROOT = path.join(process.cwd(), "public", "content");

/** Extensions we are willing to expose through the portal. */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".bmp",
  ".mp4",
  ".webm",
  ".mov",
  ".ogv",
  ".html",
  ".htm",
  ".txt",
  ".md",
  ".csv",
  ".json",
  // Office / Word documents
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".ppt",
  ".pptx",
  ".pps",
  ".xls",
  ".xlsx",
  ".ods",
]);

/**
 * GET /api/tracks/[trackId]
 *
 * Reads the filesystem folder mapped to the requested track and returns the
 * list of supported files. The route is deliberately strict:
 *   - Only predefined track IDs are accepted (1..5).
 *   - The resolved folder path is always inside CONTENT_ROOT.
 *   - Directories and dotfiles are ignored.
 *   - No absolute/server paths are ever returned to the client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  try {
    const { trackId } = await params;

    // 1. Validate the track id is a positive integer within the allow-list.
    const numericId = Number(trackId);
    if (
      !Number.isInteger(numericId) ||
      !validTrackIds.includes(numericId)
    ) {
      const body: ApiErrorResponse = {
        error: "معرّف المحور غير صالح",
        code: "INVALID_TRACK",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const track = getTrackById(numericId);
    if (!track) {
      const body: ApiErrorResponse = {
        error: "المحور غير موجود",
        code: "NOT_FOUND",
      };
      return NextResponse.json(body, { status: 404 });
    }

    // 2. Build the absolute folder path and verify it stays inside CONTENT_ROOT.
    const folderPath = path.join(CONTENT_ROOT, track.folder);
    const normalizedRoot = path.normalize(CONTENT_ROOT);
    const normalizedFolder = path.normalize(folderPath);
    if (!normalizedFolder.startsWith(normalizedRoot + path.sep)) {
      const body: ApiErrorResponse = {
        error: "مسار غير مصروح به",
        code: "INVALID_TRACK",
      };
      return NextResponse.json(body, { status: 400 });
    }

    // 3. Read the directory. Missing folder => 404, never a crash.
    let entries: string[];
    try {
      entries = await fs.readdir(normalizedFolder);
    } catch {
      const body: ApiErrorResponse = {
        error: "لا يوجد محتوى لهذا المحور",
        code: "NOT_FOUND",
      };
      return NextResponse.json(body, { status: 404 });
    }

    // 4. Filter to supported files, gather metadata concurrently.
    const stats = await Promise.all(
      entries.map(async (name) => {
        try {
          const full = path.join(normalizedFolder, name);
          const stat = await fs.stat(full);
          return { name, stat, full };
        } catch {
          return null;
        }
      }),
    );

    const files: ContentFile[] = stats
      .filter(
        (s): s is { name: string; stat: fs.Stats; full: string } =>
          s !== null && s.stat.isFile(),
      )
      .filter((s) => {
        const ext = getExtension(s.name);
        return (
          ALLOWED_EXTENSIONS.has(ext) &&
          !s.name.startsWith(".") &&
          !s.name.startsWith("_")
        );
      })
      .map((s) => ({
        name: s.name,
        // Public, relative URL only — never expose the server path.
        url: `/content/${track.folder}/${encodeURIComponent(s.name)}`,
        type: getFileType(s.name),
        extension: getExtension(s.name),
        size: s.stat.size,
      }))
      // Deterministic ordering: alphabetical (Arabic-aware).
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const body: TrackApiResponse = {
      track: {
        id: track.id,
        title: track.title,
        subtitle: track.subtitle,
      },
      files,
    };

    // Cache briefly to keep track switching snappy without going stale.
    return NextResponse.json(body, {
      headers: {
        "Cache-Control":
          "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    const body: ApiErrorResponse = {
      error: "حدث خطأ غير متوقع أثناء جلب المحتوى",
      code: "SERVER_ERROR",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

/** Pre-render the known track ids at build time. */
export function generateStaticParams() {
  return tracks.map((t) => ({ trackId: String(t.id) }));
}
