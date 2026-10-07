import { NextResponse } from "next/server";
import {
  getSessionReport,
  getAllSessionReports,
  upsertSessionReport,
  isValidTrackId,
} from "@/lib/track-session-server";
import type {
  SessionReport,
  ApiErrorPayload,
  ApiSuccessResponse,
} from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/sessions/[trackId]/report?paperSlot=N
 *
 * Returns the session chair's private report for a specific paper slot.
 * If no paperSlot is provided, returns the general report.
 * If paperSlot=all, returns ALL reports for the track.
 *
 * Used only by the admin interface — visitors never see this.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await params;
  const numericId = Number(trackId);
  const { searchParams } = new URL(request.url);
  const paperSlotParam = searchParams.get("paperSlot");

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  // If paperSlot=all, return all reports for this track.
  if (paperSlotParam === "all") {
    const reports = await getAllSessionReports(numericId);
    return NextResponse.json(
      { trackId: numericId, reports },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Otherwise, return a single report (general or specific paper).
  const paperSlot = paperSlotParam
    ? parseInt(paperSlotParam, 10) || null
    : null;

  const report = await getSessionReport(numericId, paperSlot);
  const body: SessionReport = report ?? { trackId: numericId };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT /api/sessions/[trackId]/report
 *
 * Saves the session chair's report. Body: { content: string, editedBy?: string, paperSlot?: number }
 * paperSlot: null/0 = general report, 1-5 = specific paper report.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await params;
  const numericId = Number(trackId);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  let content = "";
  let editedBy: string | undefined;
  let paperSlot: number | null = null;
  try {
    const json = await request.json();
    content = String(json.content ?? "");
    editedBy = json.editedBy ? String(json.editedBy) : undefined;
    // paperSlot: 0 or undefined → null (general), 1-5 → specific paper.
    const slot = json.paperSlot ? parseInt(String(json.paperSlot), 10) : 0;
    paperSlot = slot > 0 ? slot : null;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  await upsertSessionReport(numericId, content, editedBy, paperSlot);
  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
