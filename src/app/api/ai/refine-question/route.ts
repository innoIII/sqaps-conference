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
 * Tries Google Gemini API first (gemini-3.8-flash). If Gemini fails (geo
 * restriction, quota, etc.), falls back to z-ai-web-dev-sdk.
 *
 * Body: { trackId: number, question: string }
 * Returns: { refined: string, note: string }
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

  const systemPrompt = [
    "أنت مساعد ذكي في مؤتمر علمي دولى يعقد في أكاديمية السلطان قابوس لعلوم الشرطة.",
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

  const buildResult = (refined: string) => ({
    refined,
    note:
      refined === question
        ? "سؤالك واضح وجاهز للإرسال"
        : "تم تحسين صياغة سؤالك — يمكنك استخدام النسخة المحسنة أو الأصلية",
  });

  // ── Try Gemini API first ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      // Try gemini-3.8-flash, then gemini-2.0-flash-exp, then gemini-1.5-flash
      const models = ["gemini-3.8-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: question }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const refined =
              data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
            if (refined) {
              return NextResponse.json(buildResult(refined));
            }
          }
          // If not ok, try next model
        } catch {
          // try next model
        }
      }
    } catch {
      // Gemini failed entirely → fall through to z-ai
    }
  }

  // ── Fallback: z-ai-web-dev-sdk ──
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });

    const refined = completion.choices[0]?.message?.content?.trim();
    if (refined) {
      return NextResponse.json(buildResult(refined));
    }
  } catch {
    // z-ai also failed → return error
  }

  const body: ApiErrorPayload = {
    error: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى.",
  };
  return NextResponse.json(body, { status: 503 });
}
