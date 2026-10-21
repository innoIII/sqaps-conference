import { randomUUID } from "node:crypto";
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
      session.chairPhone = row.chairPhone ?? undefined;
      session.secretaryPhone = row.secretaryPhone ?? undefined;
      session.mapHall = row.mapHall ?? undefined;

      const papers: ResearchPaper[] = row.papers.map((p) => ({
        trackId,
        slot: p.slot,
        title: p.title ?? undefined,
        researcher: p.researcher ?? undefined,
        phone: p.phone ?? undefined,
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

/**
 * Make sure the session row exists (reports and papers reference it). A single
 * INSERT … ON CONFLICT DO NOTHING, so many people saving at the same moment on
 * a session that has no row yet can't collide (Prisma's upsert here is a
 * read-then-insert and fails with a unique-constraint error under load).
 */
async function ensureTrackSession(trackId: number): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "track_sessions" ("id", "trackId", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${trackId}, NOW(), NOW())
    ON CONFLICT ("trackId") DO NOTHING`;
}

/** Upsert a single research-paper slot. Slot can be any positive integer (dynamic). */
export async function upsertResearchPaper(
  trackId: number,
  slot: number,
  data: Partial<Omit<ResearchPaper, "trackId" | "slot">>,
): Promise<void> {
  if (!dbAvailable()) return;
  if (slot < 1) return;
  await ensureTrackSession(trackId);
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

/**
 * Upsert a report (chair or secretary) for a specific paper slot (or general if null).
 *
 * One atomic INSERT … ON CONFLICT, so two people saving at the same moment can
 * never create duplicate rows (the unique index is NULLS NOT DISTINCT, so the
 * general report — paperSlot NULL — is covered too). Errors are thrown so the
 * route can tell the user the save failed.
 */
export async function upsertSessionReport(
  trackId: number,
  content: string,
  editedBy?: string,
  paperSlot?: number | null,
  role: ReportRole = "chair",
): Promise<void> {
  if (!dbAvailable()) return;
  await ensureTrackSession(trackId);
  const slot = paperSlot ?? null;
  await db.$executeRaw`
    INSERT INTO "session_reports" ("id", "trackId", "paperSlot", "role", "content", "editedBy", "updatedAt")
    VALUES (${randomUUID()}, ${trackId}, ${slot}, ${role}, ${content}, ${editedBy ?? null}, NOW())
    ON CONFLICT ("trackId", "paperSlot", "role")
    DO UPDATE SET "content" = EXCLUDED."content", "editedBy" = EXCLUDED."editedBy", "updatedAt" = NOW()`;
}
