import { NextResponse } from "next/server";
import {
  getSessionReport,
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
 * GET /api/sessions/[trackId]/report
 *
 * Returns the session chair's private report. Used only by the admin iPad
 * interface — visitors never see this.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await params;
  const numericId = Number(trackId);

  if (!Number.isInteger(numericId) || !isValidTrackId(numericId)) {
    const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const report = await getSessionReport(numericId);
  const body: SessionReport = report ?? { trackId: numericId };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT /api/sessions/[trackId]/report
 *
 * Saves the session chair's report. Body: { content: string, editedBy?: string }
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
  try {
    const json = await request.json();
    content = String(json.content ?? "");
    editedBy = json.editedBy ? String(json.editedBy) : undefined;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  await upsertSessionReport(numericId, content, editedBy);
  const body: ApiSuccessResponse = { success: true };
  return NextResponse.json(body);
}
