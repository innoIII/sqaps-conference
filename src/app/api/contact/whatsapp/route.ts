import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact/whatsapp
 *
 * Receives a message from a site visitor and forwards it as a WhatsApp
 * notification to the conference's support phone via CallMeBot.
 *
 * The visitor never gets a reply — this is a one-way notification channel so
 * the organizing team is alerted instantly when someone fills the contact
 * popup.
 *
 * Required env vars (set in Vercel → Environment Variables):
 *   - CALLMEBOT_API_KEY   : the API key from CallMeBot
 *   - CALLMEBOT_PHONE     : the recipient phone (international format, e.g. 96825656565)
 *
 * CallMeBot API docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Body: { "message": string, "from"?: string }
 */
interface ContactPayload {
  message?: unknown;
  from?: unknown;
}

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    const body: ApiErrorPayload = { error: "جسم الطلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";
  const from =
    typeof payload.from === "string" ? payload.from.trim() : "زائر";

  if (!message) {
    const body: ApiErrorPayload = { error: "الرسالة فارغة" };
    return NextResponse.json(body, { status: 400 });
  }

  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone = process.env.CALLMEBOT_PHONE;

  if (!apiKey || !phone) {
    // Service not configured — return a soft success so the UI doesn't error
    // in front of the visitor, but log it for the operator.
    console.warn("CallMeBot not configured (missing API key or phone).");
    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  }

  // Build the notification text sent to the support team's WhatsApp.
  const notification = [
    "📩 *رسالة جديدة من زائر الموقع*",
    "",
    `*من:* ${from}`,
    `*الرسالة:*`,
    message,
    "",
    `_أكاديمية السلطان قابوس لعلوم الشرطة_`,
  ].join("\n");

  try {
    // CallMeBot endpoint — WhatsApp message via HTTP GET.
    const url = new URL("https://api.callmebot.com/whatsapp.php");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", notification);
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`CallMeBot responded ${res.status}`);
    }

    const body: ApiSuccessResponse = { success: true };
    return NextResponse.json(body);
  } catch {
    const body: ApiErrorPayload = {
      error: "تعذر إرسال الإشعار. حاول مرة أخرى لاحقًا.",
    };
    return NextResponse.json(body, { status: 502 });
  }
}
