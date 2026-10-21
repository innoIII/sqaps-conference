import { NextResponse } from "next/server";
import {
  getSessionReport,
  getAllSessionReports,
  upsertSessionReport,
  parseReportRole,
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
 * GET /api/sessions/[trackId]/report?paperSlot=N&role=chair|secretary
 *
 * Returns a private report (chair's by default, the rapporteur's with
 * role=secretary) for a specific paper slot.
 * If no paperSlot is provided, returns the general report.
 * If paperSlot=all, returns ALL reports for the track (both roles unless
 * `role` is given).
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
  const roleParam = searchParams.get("role");
  const role = parseReportRole(roleParam);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  // If paperSlot=all, return all reports for this track.
  if (paperSlotParam === "all") {
    const reports = await getAllSessionReports(
      numericId,
      roleParam ? role : undefined,
    );
    return NextResponse.json(
      { trackId: numericId, reports },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Otherwise, return a single report (general or specific paper).
  const paperSlot = paperSlotParam
    ? parseInt(paperSlotParam, 10) || null
    : null;

  const report = await getSessionReport(numericId, paperSlot, role);
  const body: SessionReport = report ?? { trackId: numericId, role };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT /api/sessions/[trackId]/report
 *
 * Saves a report. Body: { content: string, editedBy?: string, paperSlot?: number, role?: "chair"|"secretary" }
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
  let role: SessionReport["role"] = "chair";
  try {
    const json = await request.json();
    content = String(json.content ?? "");
    editedBy = json.editedBy ? String(json.editedBy) : undefined;
    // paperSlot: 0 or undefined → null (general), 1-5 → specific paper.
    const slot = json.paperSlot ? parseInt(String(json.paperSlot), 10) : 0;
    paperSlot = slot > 0 ? slot : null;
    role = parseReportRole(json.role);
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    await upsertSessionReport(numericId, content, editedBy, paperSlot, role);
  } catch {
    const body: ApiErrorPayload = { error: "تعذر حفظ التقرير في قاعدة البيانات، حاول مرة أخرى" };
    return NextResponse.json(body, { status: 500 });
  }
  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
