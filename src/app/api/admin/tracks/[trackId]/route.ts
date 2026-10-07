import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAllContent,
  upsertContent,
} from "@/lib/site-content-server";
import type { ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";

/** Whether the DB is likely usable (postgres URL configured). */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * DELETE /api/admin/tracks/[trackId]
 *
 * Completely removes a track and ALL its associated data:
 *   - SiteContent keys: `track.N.title`, `track.N.subtitle`, `track.N.icon`
 *   - TrackSession row (cascades ResearchPaper + SessionReport)
 *   - PaperFile rows for this trackId
 *   - Question rows for this trackId
 *
 * Then renumbers subsequent tracks down by 1 so the track list stays
 * contiguous (e.g. deleting track 3 makes old track 4 → 3, old 5 → 4, ...).
 * Finally decrements `tracks.count`.
 *
 * This is a "hard delete" — the track's customized data is gone forever.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId: trackIdStr } = await params;
  const trackId = parseInt(trackIdStr, 10);
  if (!Number.isInteger(trackId) || trackId < 1) {
    return NextResponse.json({ error: "معرّف المحور غير صالح" }, { status: 400 });
  }

  const content = await getAllContent();
  const currentCount = Math.max(
    0,
    parseInt(content["tracks.count"] ?? "0", 10) || 0,
  );

  // Note: we deliberately do NOT 404 when trackId > currentCount. In local dev
  // (no DB) the server always returns the static default count (5), but the
  // admin may have optimistically added tracks 6, 7, 8... client-side. The
  // DELETE should still succeed (and just no-op on the DB side) so the client
  // can apply its optimistic renumbering. On Vercel with a DB, currentCount
  // reflects the true persisted count.

  // 1) Delete the track's DB rows (session + papers + report + questions + files).
  if (dbAvailable()) {
    try {
      // PaperFile is not relationally linked — delete explicitly.
      await db.paperFile.deleteMany({ where: { trackId } });
      // TrackSession cascade-deletes ResearchPaper + SessionReport.
      await db.trackSession.deleteMany({ where: { trackId } });
      // Questions for this track.
      await db.question.deleteMany({ where: { trackId } });
    } catch {
      // Non-fatal — continue to renumber content keys.
    }
  }

  // 2) Delete this track's SiteContent keys + renumber subsequent tracks down.
  // Build a list of (oldId, newId) renumber pairs.
  const renumbers: Array<{ oldId: number; newId: number }> = [];
  for (let id = trackId + 1; id <= currentCount; id++) {
    renumbers.push({ oldId: id, newId: id - 1 });
  }

  // Apply renumbering by reading old keys and upserting new keys.
  // We do this carefully to avoid overwriting before reading.
  if (dbAvailable()) {
    try {
      // Collect all SiteContent rows we care about.
      const allRows = await db.siteContent.findMany();
      const rowMap = new Map(allRows.map((r) => [r.key, r.value]));

      // Helper to fetch a track-related key.
      const getKey = (id: number, suffix: string) =>
        rowMap.get(`track.${id}.${suffix}`) ?? null;

      // Track N being deleted — delete its keys.
      await db.siteContent.deleteMany({
        where: { key: { startsWith: `track.${trackId}.` } },
      });

      // Renumber each subsequent track's keys.
      for (const { oldId, newId } of renumbers) {
        // Delete the newId's keys first (in case of overlap when oldId==newId+1).
        await db.siteContent.deleteMany({
          where: { key: { startsWith: `track.${newId}.` } },
        });
        const title = getKey(oldId, "title");
        const subtitle = getKey(oldId, "subtitle");
        const icon = getKey(oldId, "icon");
        if (title !== null) {
          await db.siteContent.upsert({
            where: { key: `track.${newId}.title` },
            create: { key: `track.${newId}.title`, value: title },
            update: { value: title },
          });
        }
        if (subtitle !== null) {
          await db.siteContent.upsert({
            where: { key: `track.${newId}.subtitle` },
            create: { key: `track.${newId}.subtitle`, value: subtitle },
            update: { value: subtitle },
          });
        }
        if (icon !== null) {
          await db.siteContent.upsert({
            where: { key: `track.${newId}.icon` },
            create: { key: `track.${newId}.icon`, value: icon },
            update: { value: icon },
          });
        }
      }

      // Delete the last track's keys (now redundant after renumbering).
      const lastId = currentCount;
      await db.siteContent.deleteMany({
        where: { key: { startsWith: `track.${lastId}.` } },
      });

      // Update tracks.count.
      await db.siteContent.upsert({
        where: { key: "tracks.count" },
        create: { key: "tracks.count", value: String(currentCount - 1) },
        update: { value: String(currentCount - 1) },
      });
    } catch {
      // DB error — fall back to no-op.
    }
  } else {
    // No DB — just update via upsertContent (no-op locally, but works on Vercel).
    await upsertContent("tracks.count", String(currentCount - 1));
  }

  // 3) Also renumber TrackSession rows so session data follows the track.
  // (e.g. old track 4's session becomes track 3's session).
  if (dbAvailable() && renumbers.length > 0) {
    try {
      for (const { oldId, newId } of renumbers) {
        // Move the oldId session to newId.
        // We do this by reading + recreating since trackId is @unique and
        // we can't simply update it if a row at newId already exists.
        const oldSession = await db.trackSession.findUnique({
          where: { trackId: oldId },
          include: { papers: true, report: true },
        });
        if (!oldSession) continue;

        // Delete any existing session at newId (shouldn't exist, but safe).
        await db.trackSession.deleteMany({ where: { trackId: newId } });

        // Create the new session row.
        const created = await db.trackSession.create({
          data: {
            trackId: newId,
            time: oldSession.time,
            venue: oldSession.venue,
            chair: oldSession.chair,
            secretary: oldSession.secretary,
          },
        });

        // Copy papers.
        for (const p of oldSession.papers) {
          await db.researchPaper.create({
            data: {
              trackId: newId,
              slot: p.slot,
              title: p.title,
              researcher: p.researcher,
              paperUrl: p.paperUrl,
              cvUrl: p.cvUrl,
            },
          });
        }

        // Copy report.
        if (oldSession.report) {
          await db.sessionReport.create({
            data: {
              trackId: newId,
              content: oldSession.report.content,
              editedBy: oldSession.report.editedBy,
            },
          });
        }

        // Copy PaperFile rows.
        const files = await db.paperFile.findMany({ where: { trackId: oldId } });
        for (const f of files) {
          await db.paperFile.create({
            data: {
              trackId: newId,
              slot: f.slot,
              fileType: f.fileType,
              fileName: f.fileName,
              fileSize: f.fileSize,
              data: f.data,
              mimeType: f.mimeType,
            },
          });
        }

        // Delete the old session row (cascades its papers + report).
        await db.trackSession.deleteMany({ where: { trackId: oldId } });
        // Delete old PaperFile rows.
        await db.paperFile.deleteMany({ where: { trackId: oldId } });

        // Use created to avoid unused-var warning.
        void created;
      }
    } catch {
      // Non-fatal.
    }
  }

  const body: ApiSuccessResponse & { count: number } = {
    success: true,
    count: currentCount - 1,
  };
  return NextResponse.json(body);
}
