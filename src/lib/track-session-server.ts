import { db } from "@/lib/db";
import type {
  ResearchPaper as PrismaResearchPaper,
  TrackSession,
  SessionReport,
} from "@prisma/client";
import type {
  ReportRole,
  ResearchPaper,
  SessionReport as SessionReportType,
  TrackSessionInfo,
} from "@/types";
import { isValidTrackId } from "@/lib/tracks";

/** Number of research-paper slots per track — dynamic (admin can add/remove). */
export const PAPER_SLOTS = 5;

// Re-export for backward compatibility.
export { isValidTrackId };

/** Whether the DB is likely usable (any DB URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  // Accept PostgreSQL (Vercel) AND SQLite (local dev).
  return (
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://") ||
    url.startsWith("file:")
  );
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
  await db.trackSession.upsert({
    where: { trackId },
    create: { trackId, ...data },
    update: { ...data },
  });
}

/** Upsert a single research-paper slot. Slot can be any positive integer (dynamic). */
export async function upsertResearchPaper(
  trackId: number,
  slot: number,
  data: Partial<Omit<ResearchPaper, "trackId" | "slot">>,
): Promise<void> {
  if (!dbAvailable()) return;
  if (slot < 1) return;
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
}

/** Delete a research-paper slot + its uploaded files. */
export async function deleteResearchPaper(
  trackId: number,
  slot: number,
): Promise<void> {
  if (!dbAvailable()) return;
  if (slot < 1) return;
  // Delete the paper's uploaded files first.
  await db.paperFile.deleteMany({
    where: { trackId, slot },
  });
  // Delete the paper row.
  await db.researchPaper.deleteMany({
    where: { trackId, slot },
  });
}

/** Parse a role from a query/body value — anything but "secretary" is the chair. */
export function parseReportRole(value: unknown): ReportRole {
  return value === "secretary" ? "secretary" : "chair";
}

/** Fetch a report (chair or secretary) for a specific paper slot (or general if null). */
export async function getSessionReport(
  trackId: number,
  paperSlot?: number | null,
  role: ReportRole = "chair",
): Promise<SessionReportType | null> {
  if (!dbAvailable()) return null;
  try {
    // findFirst, not findUnique: Prisma rejects null inside a compound
    // unique key, and the general report is stored with paperSlot = null.
    const slot = paperSlot ?? null;
    const row = await db.sessionReport.findFirst({
      where: { trackId, paperSlot: slot, role },
    });
    if (!row) return null;
    return {
      trackId,
      role,
      content: row.content ?? undefined,
      editedBy: row.editedBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/** Fetch ALL reports for a track (general + all paper slots), optionally for one role. */
export async function getAllSessionReports(
  trackId: number,
  role?: ReportRole,
): Promise<Array<SessionReportType & { paperSlot: number | null }>> {
  if (!dbAvailable()) return [];
  try {
    const rows = await db.sessionReport.findMany({
      where: role ? { trackId, role } : { trackId },
      // chair before secretary; null (general) first, then 1, 2, 3...
      orderBy: [{ role: "asc" }, { paperSlot: "asc" }],
    });
    return rows.map((row) => ({
      trackId,
      role: parseReportRole(row.role),
      paperSlot: row.paperSlot,
      content: row.content ?? undefined,
      editedBy: row.editedBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Upsert a report (chair or secretary) for a specific paper slot (or general if null). */
export async function upsertSessionReport(
  trackId: number,
  content: string,
  editedBy?: string,
  paperSlot?: number | null,
  role: ReportRole = "chair",
): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await db.trackSession.upsert({
      where: { trackId },
      create: { trackId },
      update: {},
    });
    // Manual upsert for the same reason as getSessionReport (null paperSlot).
    const slot = paperSlot ?? null;
    const existing = await db.sessionReport.findFirst({
      where: { trackId, paperSlot: slot, role },
      select: { id: true },
    });
    if (existing) {
      await db.sessionReport.update({
        where: { id: existing.id },
        data: { content, editedBy },
      });
    } else {
      await db.sessionReport.create({
        data: { trackId, paperSlot: slot, role, content, editedBy },
      });
    }
  } catch {
    // silent
  }
}
