import { db } from "@/lib/db";
import type {
  ResearchPaper as PrismaResearchPaper,
  TrackSession,
  SessionReport,
} from "@prisma/client";
import type {
  ResearchPaper,
  SessionReport as SessionReportType,
  TrackSessionInfo,
} from "@/types";
import { isValidTrackId } from "@/lib/tracks";

/** Number of research-paper slots per track — dynamic (admin can add/remove). */
export const PAPER_SLOTS = 5;

// Re-export for backward compatibility.
export { isValidTrackId };

/** Whether the DB is likely usable (postgres URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * Fetch a track session (header info + papers), gracefully degrading to empty
 * defaults when the DB is unavailable (local dev without postgres).
 *
 * Papers are dynamic — the admin can add/remove them. Returns whatever papers
 * exist in the DB (sorted by slot). If no DB, returns 5 default empty slots.
 */
export async function getTrackSession(
  trackId: number,
): Promise<{ session: TrackSessionInfo; papers: ResearchPaper[] }> {
  const session: TrackSessionInfo = { trackId };

  if (!dbAvailable()) {
    const papers: ResearchPaper[] = Array.from({ length: PAPER_SLOTS }, (_, i) => ({
      trackId,
      slot: i + 1,
    }));
    return { session, papers };
  }

  try {
    const row = await db.trackSession.findUnique({
      where: { trackId },
      include: { papers: { orderBy: { slot: "asc" } } },
    });

    if (row) {
      session.time = row.time ?? undefined;
      session.venue = row.venue ?? undefined;
      session.chair = row.chair ?? undefined;
      session.secretary = row.secretary ?? undefined;

      const papers: ResearchPaper[] = row.papers.map((p) => ({
        trackId,
        slot: p.slot,
        title: p.title ?? undefined,
        researcher: p.researcher ?? undefined,
        paperUrl: p.paperUrl ?? undefined,
        cvUrl: p.cvUrl ?? undefined,
      }));

      return { session, papers };
    }
  } catch {
    // DB error → fall through to defaults
  }

  // No DB row → return 5 default empty slots.
  const papers: ResearchPaper[] = Array.from({ length: PAPER_SLOTS }, (_, i) => ({
    trackId,
    slot: i + 1,
  }));
  return { session, papers };
}

/** Upsert session header info (time / venue / chair / secretary). */
export async function upsertTrackSession(
  trackId: number,
  data: Partial<Omit<TrackSessionInfo, "trackId">>,
): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await db.trackSession.upsert({
      where: { trackId },
      create: { trackId, ...data },
      update: { ...data },
    });
  } catch {
    // silent — admin UI will show error via the API response
  }
}

/** Upsert a single research-paper slot. Slot can be any positive integer (dynamic). */
export async function upsertResearchPaper(
  trackId: number,
  slot: number,
  data: Partial<Omit<ResearchPaper, "trackId" | "slot">>,
): Promise<void> {
  if (!dbAvailable()) return;
  if (slot < 1) return;
  try {
    // Ensure the session row exists (FK constraint).
    await db.trackSession.upsert({
      where: { trackId },
      create: { trackId },
      update: {},
    });
    await db.researchPaper.upsert({
      where: { trackId_slot: { trackId, slot } },
      create: { trackId, slot, ...data },
      update: { ...data },
    });
  } catch {
    // silent
  }
}

/** Delete a research-paper slot + its uploaded files. */
export async function deleteResearchPaper(
  trackId: number,
  slot: number,
): Promise<void> {
  if (!dbAvailable()) return;
  if (slot < 1) return;
  try {
    // Delete the paper's uploaded files first.
    await db.paperFile.deleteMany({
      where: { trackId, slot },
    });
    // Delete the paper row.
    await db.researchPaper.deleteMany({
      where: { trackId, slot },
    });
  } catch {
    // silent
  }
}

/** Fetch the session chair's report for a specific paper slot (or general if null). */
export async function getSessionReport(
  trackId: number,
  paperSlot?: number | null,
): Promise<SessionReportType | null> {
  if (!dbAvailable()) return null;
  try {
    // Normalize: undefined → null (for the DB unique constraint).
    const slot = paperSlot === undefined ? null : paperSlot;
    const row = await db.sessionReport.findUnique({
      where: { trackId_paperSlot: { trackId, paperSlot: slot } },
    });
    if (!row) return null;
    return {
      trackId,
      content: row.content ?? undefined,
      editedBy: row.editedBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/** Fetch ALL reports for a track (general + all paper slots). */
export async function getAllSessionReports(
  trackId: number,
): Promise<Array<SessionReportType & { paperSlot: number | null }>> {
  if (!dbAvailable()) return [];
  try {
    const rows = await db.sessionReport.findMany({
      where: { trackId },
      orderBy: { paperSlot: "asc" }, // null (general) first, then 1, 2, 3...
    });
    return rows.map((row) => ({
      trackId,
      paperSlot: row.paperSlot,
      content: row.content ?? undefined,
      editedBy: row.editedBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Upsert the session chair's report for a specific paper slot (or general if null). */
export async function upsertSessionReport(
  trackId: number,
  content: string,
  editedBy?: string,
  paperSlot?: number | null,
): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await db.trackSession.upsert({
      where: { trackId },
      create: { trackId },
      update: {},
    });
    const slot = paperSlot === undefined ? null : paperSlot;
    await db.sessionReport.upsert({
      where: { trackId_paperSlot: { trackId, paperSlot: slot } },
      create: { trackId, paperSlot: slot, content, editedBy },
      update: { content, editedBy },
    });
  } catch {
    // silent
  }
}
