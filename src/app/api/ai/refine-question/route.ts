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
 * Uses Groq API (Llama 3.3 70B — free, 5000 req/day, very fast) to help the
 * audience refine their question based on the selected track's topic.
 *
 * Falls back to z-ai-web-dev-sdk if Groq fails.
 *
 * Required env: GROQ_API_KEY
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

  const buildResult = (refined: string) => ({
    refined,
    note:
      refined === question
        ? "سؤالك واضح وجاهز للإرسال"
        : "تم تحسين صياغة سؤالك — يمكنك استخدام النسخة المحسنة أو الأصلية",
  });

  // ── Try Groq API (Llama 3.3 70B — free + fast) ──
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0.4,
          max_tokens: 200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const refined = data?.choices?.[0]?.message?.content?.trim();
        if (refined) {
          return NextResponse.json(buildResult(refined));
        }
      }
      // Groq failed → fall through to OpenRouter
    } catch {
      // Groq error → fall through to OpenRouter
    }
  }

  // ── Fallback 1: OpenRouter (free models — Llama 3.1 8B) ──
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0.4,
          max_tokens: 200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const refined = data?.choices?.[0]?.message?.content?.trim();
        if (refined) {
          return NextResponse.json(buildResult(refined));
        }
      }
      // OpenRouter failed → fall through to z-ai
    } catch {
      // OpenRouter error → fall through to z-ai
    }
  }

  // ── Fallback 2: z-ai-web-dev-sdk ──
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
    // z-ai also failed
  }

  const body: ApiErrorPayload = {
    error: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى.",
  };
  return NextResponse.json(body, { status: 503 });
}
