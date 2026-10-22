import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTrackId } from "@/lib/tracks";
import { hashPin, isValidPin } from "@/lib/report-pin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin only (src/proxy.ts guards /api/admin/*).
 *   GET → { locked }            whether this session's reports need a PIN
 *   PUT { pin: "1234" }         set or change the PIN (4–12 letters/digits)
 *   PUT { pin: null }           remove it (reports open again)
 */
async function id(params: Promise<{ trackId: string }>) {
  const n = Number((await params).trackId);
  return Number.isInteger(n) && isValidTrackId(n) ? n : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const trackId = await id(params);
  if (!trackId) return NextResponse.json({ error: "معرّف الجلسة غير صالح" }, { status: 400 });
  const row = await db.trackSession.findUnique({ where: { trackId }, select: { reportPinHash: true } });
  return NextResponse.json({ locked: !!row?.reportPinHash }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const trackId = await id(params);
  if (!trackId) return NextResponse.json({ error: "معرّف الجلسة غير صالح" }, { status: 400 });
  let pin: string | null;
  try {
    const body = await request.json();
    pin = body?.pin == null || body.pin === "" ? null : String(body.pin).trim();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (pin !== null && !isValidPin(pin)) {
    return NextResponse.json({ error: "الرمز من ٤ إلى ١٢ حرفاً أو رقماً إنجليزياً" }, { status: 400 });
  }
  const reportPinHash = pin ? hashPin(pin) : null;
  await db.trackSession.upsert({
    where: { trackId },
    create: { trackId, reportPinHash },
    update: { reportPinHash },
  });
  return NextResponse.json({ success: true, locked: !!pin });
}
