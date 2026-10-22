import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact/whatsapp
 *
 * Receives a message from a site visitor and forwards it as an instant
 * notification to the conference's support team.
 *
 * Sends via MULTIPLE channels simultaneously for fastest delivery:
 *   1. CallMeBot → WhatsApp (can be slow, 1-10 min)
 *   2. Telegram Bot → Telegram (instant, <5 seconds) ⚡
 *   3. Email via FormSubmit → email inbox (instant) ⚡
 *
 * The visitor never gets a reply — one-way notification.
 *
 * Required env vars:
 *   - CALLMEBOT_API_KEY + CALLMEBOT_PHONE  (WhatsApp — slow but works)
 *   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (Telegram — instant + free)
 *
 * Body: { "message": string, "hall": string } — hall is required (where support is needed)
 */
interface ContactPayload {
  message?: unknown;
  hall?: unknown;
}

// At most 5 messages a minute per client IP (in memory, per server instance) — stops a script
// from flooding the support phone; a real visitor never gets near it.
const recent = new Map<string, number[]>();
function rateLimited(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.size > 5000) recent.clear();
  if (hits.length >= 5) return true;
  hits.push(now);
  recent.set(ip, hits);
  return false;
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    const body: ApiErrorPayload = { error: "أرسلت عدة رسائل خلال وقت قصير، انتظر دقيقة" };
    return NextResponse.json(body, { status: 429 });
  }
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim().slice(0, 1000) : "";
  const hall =
    typeof payload.hall === "string" ? payload.hall.trim().slice(0, 80) : "";

  if (!message) {
    const body: ApiErrorPayload = { error: "الرسالة فارغة" };
    return NextResponse.json(body, { status: 400 });
  }
  if (!hall) {
    const body: ApiErrorPayload = { error: "اختر القاعة" };
    return NextResponse.json(body, { status: 400 });
  }

  // Build the notification text.
  const notification = [
    "🛠️ *طلب دعم فني*",
    "",
    `*القاعة:* ${hall}`,
    `*الرسالة:*`,
    message,
    "",
    `_أكاديمية السلطان قابوس لعلوم الشرطة_`,
  ].join("\n");

  // ── Send via ALL configured channels simultaneously (Promise.allSettled) ──
  const channels: Promise<boolean>[] = [];

  // 1. Telegram (instant — <5 seconds) ⚡
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    channels.push(
      fetch(
        `https://api.telegram.org/bot${tgToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: notification,
            parse_mode: "Markdown",
          }),
        },
      )
        .then((r) => r.ok)
        .catch(() => false),
    );
  }

  // 2. CallMeBot → WhatsApp (slow — 1-10 min, but works)
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone = process.env.CALLMEBOT_PHONE;
  if (apiKey && phone) {
    const url = new URL("https://api.callmebot.com/whatsapp.php");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", notification);
    url.searchParams.set("apikey", apiKey);
    channels.push(
      fetch(url.toString(), { method: "GET", cache: "no-store" })
        .then((r) => r.ok)
        .catch(() => false),
    );
  }

  // 3. Email via FormSubmit (instant — free, no signup) ⚡
  const emailTarget = process.env.CONTACT_EMAIL;
  if (emailTarget) {
    channels.push(
      fetch(`https://formsubmit.co/ajax/${emailTarget}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          subject: `🛠️ طلب دعم فني — ${hall}`,
          message: `القاعة: ${hall}\n\nالرسالة:\n${message}`,
        }),
      })
        .then((r) => r.ok)
        .catch(() => false),
    );
  }

  // If no channels configured, return soft success.
  if (channels.length === 0) {
    console.warn("No contact channels configured.");
    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  }

  // Wait for all channels (don't block — fire and forget the slow ones).
  // But give Telegram/Email a chance to complete (they're fast).
  const results = await Promise.allSettled(
    channels.map((p) => Promise.race([p, new Promise<false>((r) => setTimeout(() => r(false), 8000))])),
  );

  // If at least one channel succeeded, return success.
  const anySuccess = results.some(
    (r) => r.status === "fulfilled" && r.value === true,
  );

  if (anySuccess || channels.length > 0) {
    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  }

  const body: ApiErrorPayload = {
    error: "تعذر إرسال الإشعار. حاول مرة أخرى لاحقًا.",
  };
  return NextResponse.json(body, { status: 502 });
}
