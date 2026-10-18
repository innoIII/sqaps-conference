import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf-extract";

/**
 * Text of a researcher's CV page, for the AI assistant.
 *
 * CVs for tracks 2+ are static PDFs (public/papers/track-N/cv-S.pdf) whose
 * text is kept clean in docs/cv/track-N/cv-S.md — the booklet PDFs have a
 * broken font map, so their raw text extracts garbled. Anything else falls
 * back to a PDF uploaded through the admin panel (paper_files table).
 *
 * The docs/cv folder is shipped with the AI routes via
 * outputFileTracingIncludes in next.config.ts.
 */
const STATIC_CV = /^\/papers\/track-(\d+)\/cv-(\d+)\.pdf$/;

export async function loadCvText(
  trackId: number,
  slot: number,
  cvUrl: string | null | undefined,
): Promise<string> {
  if (!cvUrl) return "";

  const m = STATIC_CV.exec(cvUrl);
  if (m) {
    try {
      const file = path.join(process.cwd(), "docs", "cv", `track-${m[1]}`, `cv-${m[2]}.md`);
      const md = await readFile(file, "utf8");
      const marker = md.indexOf("## النص");
      return (marker >= 0 ? md.slice(marker + "## النص".length) : md).trim();
    } catch {
      return "";
    }
  }

  try {
    const row = await db.paperFile.findUnique({
      where: { trackId_slot_fileType: { trackId, slot, fileType: "cv" } },
    });
    return row ? await extractPdfText(row.data) : "";
  } catch {
    return "";
  }
}
