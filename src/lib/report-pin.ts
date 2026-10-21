import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";

/**
 * Per-session PIN for the private reports (chair + rapporteur) and their AI
 * assistant. Set, changed or removed from /admin; stored only as a salted
 * scrypt hash in track_sessions.reportPinHash. The client sends the PIN in the
 * `x-report-pin` header; the admin (Basic Auth) is always allowed.
 */

export const PIN_HEADER = "x-report-pin";
const PIN_RE = /^[0-9A-Za-z]{4,12}$/;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const got = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(got, expected);
}

// Wrong-PIN throttle: 8 misses per 10 minutes per client + session (in memory, per server instance).
const misses = new Map<string, number[]>();
const WINDOW = 10 * 60_000;
const MAX_MISSES = 8;

function clientKey(request: Request, trackId: number): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${ip}|${trackId}`;
}

/**
 * null = allowed; otherwise the 401/429 response to return.
 * Sessions without a PIN stay open (as before).
 */
export async function checkReportAccess(request: Request, trackId: number): Promise<Response | null> {
  if (isAdminAuthorized(request.headers.get("authorization"))) return null;
  const row = await db.trackSession.findUnique({ where: { trackId }, select: { reportPinHash: true } });
  if (!row?.reportPinHash) return null;

  const key = clientKey(request, trackId);
  const now = Date.now();
  const recent = (misses.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= MAX_MISSES) {
    return NextResponse.json(
      { error: "محاولات كثيرة برمز خاطئ — حاول بعد ١٠ دقائق", locked: true },
      { status: 429 },
    );
  }
  const pin = (request.headers.get(PIN_HEADER) ?? "").trim();
  if (pin && isValidPin(pin) && verifyPin(pin, row.reportPinHash)) {
    misses.delete(key);
    return null;
  }
  if (pin) {
    recent.push(now);
    misses.set(key, recent);
    if (misses.size > 5000) misses.clear();
  }
  return NextResponse.json(
    { error: pin ? "الرمز غير صحيح" : "تقارير هذه الجلسة محمية برمز", locked: true },
    { status: 401 },
  );
}
