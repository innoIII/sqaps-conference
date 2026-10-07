import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTrackId } from "@/lib/tracks";
import type { ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Max file size: 10MB (base64 ~13MB). */
const MAX_SIZE = 10 * 1024 * 1024;

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * POST /api/papers/upload
 *
 * Uploads a PDF file (base64) to the DB.
 *
 * Body: { trackId, slot, fileType, fileName, data }
 *   - trackId: number (1..50)
 *   - slot: number (1..5)
 *   - fileType: "paper" | "cv"
 *   - fileName: string
 *   - data: base64 string (without data: prefix)
 */
export async function POST(request: Request) {
  let trackId: number;
  let slot: number;
  let fileType: string;
  let fileName: string;
  let data: string;

  try {
    const json = await request.json();
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    slot = parseInt(String(json.slot ?? "0"), 10);
    fileType = String(json.fileType ?? "");
    fileName = String(json.fileName ?? "");
    data = String(json.data ?? "");
  } catch {
    const body: ApiErrorPayload = { error: "طلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!isValidTrackId(trackId) || slot < 1 || slot > 5) {
    const body: ApiErrorPayload = { error: "معرّف المحور أو الورقة غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (fileType !== "paper" && fileType !== "cv") {
    const body: ApiErrorPayload = { error: "نوع الملف غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!data) {
    const body: ApiErrorPayload = { error: "الملف فارغ" };
    return NextResponse.json(body, { status: 400 });
  }

  // Estimate decoded size (base64 ~33% larger).
  const estimatedSize = Math.floor((data.length * 3) / 4);
  if (estimatedSize > MAX_SIZE) {
    const body: ApiErrorPayload = { error: "حجم الملف يتجاوز ١٠ ميجابايت" };
    return NextResponse.json(body, { status: 413 });
  }

  if (!dbAvailable()) {
    const body: ApiErrorPayload = { error: "قاعدة البيانات غير متاحة" };
    return NextResponse.json(body, { status: 503 });
  }

  try {
    await db.paperFile.upsert({
      where: { trackId_slot_fileType: { trackId, slot, fileType } },
      create: {
        trackId,
        slot,
        fileType,
        fileName,
        fileSize: estimatedSize,
        data,
        mimeType: "application/pdf",
      },
      update: {
        fileName,
        fileSize: estimatedSize,
        data,
      },
    });

    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  } catch {
    const body: ApiErrorPayload = { error: "تعذر حفظ الملف" };
    return NextResponse.json(body, { status: 500 });
  }
}

/**
 * DELETE /api/papers/upload?trackId=N&slot=S&fileType=T
 * Deletes a paper file from the DB.
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "0", 10);
  const slot = parseInt(searchParams.get("slot") ?? "0", 10);
  const fileType = searchParams.get("fileType") ?? "";

  if (!isValidTrackId(trackId) || slot < 1 || slot > 5) {
    const body: ApiErrorPayload = { error: "معرّف غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!dbAvailable()) {
    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  }

  try {
    await db.paperFile.deleteMany({
      where: { trackId, slot, fileType },
    });
    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  } catch {
    const body: ApiErrorPayload = { error: "تعذر حذف الملف" };
    return NextResponse.json(body, { status: 500 });
  }
}
