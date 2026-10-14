import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTrackId } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * GET /api/papers/download?trackId=N&slot=S&fileType=T
 *
 * Returns the PDF file as a binary download (Content-Type: application/pdf).
 * Used by the <a download> links and iframe previews on the main site.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = parseInt(searchParams.get("trackId") ?? "0", 10);
  const slot = parseInt(searchParams.get("slot") ?? "0", 10);
  const fileType = searchParams.get("fileType") ?? "";

  if (!isValidTrackId(trackId) || slot < 1 || slot > 5) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  if (!dbAvailable()) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  try {
    const file = await db.paperFile.findUnique({
      where: { trackId_slot_fileType: { trackId, slot, fileType } },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Convert base64 to binary.
    const buffer = Buffer.from(file.data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
