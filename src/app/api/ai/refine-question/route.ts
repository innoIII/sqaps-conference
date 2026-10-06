import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/tracks";
import { getContent } from "@/lib/site-content-server";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

interface RefineRequest {
  question?: unknown;
  trackId?: unknown;
}

/**
 * POST /api/ai/refine-question
 *
 * Uses Google Gemini API to help the audience refine and clarify their
 * question based on the selected track's topic. The AI reads the track's
 * dynamic title/subtitle (from the DB) and suggests a clearer, more focused
 * version of the question.
 *
 * Required env: GEMINI_API_KEY
 *
 * Body: { trackId: number, question: string }
 * Returns: { refined: string, note: string }
 *
 * Only used on /qn (audience question submission page).
 */
export async function POST(request: Request) {
  let trackId: number;
  let question: string;

  try {
    const json = (await request.json()) as RefineRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    question = String(json.question ?? "").trim();
  } catch {
    const body: ApiErrorPayload = { error: "طلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!question || question.length < 5) {
    const body: ApiErrorPayload = {
      error: "اكتب سؤالك أولًا (٥ أحرف على الأقل)",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 400 });
  }

  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const body: ApiErrorPayload = {
      error: "المساعد الذكي غير مُفعّل (مفتاح Gemini غير مضبوط)",
    };
    return NextResponse.json(body, { status: 503 });
  }

  const systemPrompt = [
    "أنت مساعد ذكي في مؤتمر علمي دولي يعقد في أكاديمية السلطان قابوس لعلوم الشرطة.",
    "مهمتك: مساعدة الجمهور على صياغة أسئلة واضحة ودقيقة مرتبطة بمحور المؤتمر.",
    "",
    `المحور المختار: ${trackTitle}`,
    `الموضوع: ${trackSubtitle}`,
    "",
    "القواعد:",
    "1. أعد صياغة السؤال بشكل أوضح وأكثر دقة",
    "2. اجعل السؤال موجزًا (جملة أو جملتين كحد أقصى)",
    "3. تأكد أن السؤال مرتبط بالمحور",
    "4. حافظ على نية السائل الأصلية",
    "5. أجب باللغة العربية فقط",
    "6. لا تضف معلومات لم يذكرها السائل",
    "",
    "أعد الصياغة فقط بدون مقدمات أو شروح إضافية.",
  ].join("\n");

  try {
    // Google Gemini API (REST) — generateContent endpoint.
    const model = "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [{ text: question }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Gemini API error:", res.status, errText);
      // Check for geo-restriction error.
      const isGeoError = errText.includes("location is not supported");
      const body: ApiErrorPayload = {
        error: isGeoError
          ? "المساعد الذكي غير متاح من هذه المنطقة — سيعمل بعد النشر على Vercel"
          : "تعذر الاتصال بالمساعد الذكي (Gemini)",
      };
      return NextResponse.json(body, { status: 502 });
    }

    const data = await res.json();
    const refined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!refined) {
      const body: ApiErrorPayload = { error: "تعذر معالجة السؤال" };
      return NextResponse.json(body, { status: 500 });
    }

    const note =
      refined === question
        ? "سؤالك واضح وجاهز للإرسال"
        : "تم تحسين صياغة سؤالك — يمكنك استخدام النسخة المحسنة أو الأصلية";

    return NextResponse.json({ refined, note });
  } catch {
    const body: ApiErrorPayload = {
      error: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى.",
    };
    return NextResponse.json(body, { status: 503 });
  }
}
