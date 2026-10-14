import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTrackId } from "@/lib/tracks";
import type { ApiErrorPayload, ApiSuccessResponse } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

interface UploadRequest {
  trackId?: unknown;
  slot?: unknown;
  fileType?: unknown;
  fileName?: unknown;
  data?: unknown;
}

/**
 * POST /api/papers/upload
 *
 * Uploads a PDF file (as base64) to the database, linked to a track + slot.
 * The file is stored in the PaperFile table and can be downloaded via
 * /api/papers/download?trackId=N&slot=S&fileType=T
 *
 * Body shape:
 *   { trackId: number, slot: number, fileType: "paper"|"cv", fileName: string, data: base64 }
 *
 * Returns: { success: true, url: string }
 */
export async function POST(request: Request) {
  // Check DB availability first — give a clear error if no DB.
  if (!dbAvailable()) {
    const body: ApiErrorPayload = {
      error: "قاعدة البيانات غير متاحة — تأكد من اتصال PostgreSQL",
    };
    return NextResponse.json(body, { status: 503 });
  }

  let trackId: number;
  let slot: number;
  let fileType: string;
  let fileName: string;
  let data: string;

  try {
    const json = (await request.json()) as UploadRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    slot = parseInt(String(json.slot ?? "0"), 10);
    fileType = String(json.fileType ?? "");
    fileName = String(json.fileName ?? "");
    data = String(json.data ?? "");

    if (!Number.isFinite(trackId) || !isValidTrackId(trackId)) {
      const body: ApiErrorPayload = { error: "معرّف المحور غير صالح" };
      return NextResponse.json(body, { status: 400 });
    }
    if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
      const body: ApiErrorPayload = { error: "رقم الورقة غير صالح (١-٥)" };
      return NextResponse.json(body, { status: 400 });
    }
    if (fileType !== "paper" && fileType !== "cv") {
      const body: ApiErrorPayload = {
        error: "نوع الملف غير صالح (paper أو cv)",
      };
      return NextResponse.json(body, { status: 400 });
    }
    if (!fileName || fileName.length === 0) {
      const body: ApiErrorPayload = { error: "اسم الملف مطلوب" };
      return NextResponse.json(body, { status: 400 });
    }
    if (!data || data.length === 0) {
      const body: ApiErrorPayload = { error: "بيانات الملف مطلوبة" };
      return NextResponse.json(body, { status: 400 });
    }

    // Validate base64 data (basic check — must be decodable).
    try {
      Buffer.from(data, "base64");
    } catch {
      const body: ApiErrorPayload = { error: "بيانات base64 غير صالحة" };
      return NextResponse.json(body, { status: 400 });
    }

    // Check file size (max 10MB after base64 decode).
    const buffer = Buffer.from(data, "base64");
    const fileSize = buffer.length;
    if (fileSize > 10 * 1024 * 1024) {
      const body: ApiErrorPayload = {
        error: "حجم الملف يتجاوز ١٠ ميجابايت",
      };
      return NextResponse.json(body, { status: 400 });
    }
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    // Upsert the file (replace if exists).
    await db.paperFile.upsert({
      where: {
        trackId_slot_fileType: { trackId, slot, fileType },
      },
      update: {
        fileName,
        fileSize: Buffer.from(data, "base64").length,
        data,
        mimeType: "application/pdf",
      },
      create: {
        trackId,
        slot,
        fileType,
        fileName,
        fileSize: Buffer.from(data, "base64").length,
        data,
        mimeType: "application/pdf",
      },
    });

    const downloadUrl = `/api/papers/download?trackId=${trackId}&slot=${slot}&fileType=${fileType}`;
    const body: ApiSuccessResponse & { url: string } = {
      success: true,
      url: downloadUrl,
    };
    return NextResponse.json(body);
  } catch (e) {
    const body: ApiErrorPayload = {
      error:
        e instanceof Error
          ? e.message
          : "تعذر حفظ الملف في قاعدة البيانات",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
