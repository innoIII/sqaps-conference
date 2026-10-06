import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
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
 * Uses the LLM (z-ai-web-dev-sdk) to help the audience refine and clarify
 * their question based on the selected track's topic. The AI reads the
 * track's dynamic title/subtitle (from the DB) and suggests a clearer,
 * more focused version of the question.
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

  // Get the track's dynamic title/subtitle (may have been edited by admin).
  const track = getTrackById(trackId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 400 });
  }

  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  try {
    const zai = await ZAI.create();

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

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });

    const refined = completion.choices[0]?.message?.content?.trim();

    if (!refined) {
      const body: ApiErrorPayload = { error: "تعذر معالجة السؤال" };
      return NextResponse.json(body, { status: 500 });
    }

    // If the refined version is essentially the same, add a note.
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
