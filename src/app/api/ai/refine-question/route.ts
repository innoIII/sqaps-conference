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
    const body: ApiErrorPayload = { error: "اكتب سؤالك أولًا (٥ أحرف على الأقل)" };
    return NextResponse.json(body, { status: 400 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 400 });
  }

  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  const trackExpertise: Record<number, string> = {
    1: "أنت خبير في العلوم الشرطية والقانون، متخصص في التشريعات الجنائية والاتفاقيات الدولية لمكافحة الجرائم العابرة للحدود. أنت ملتم بالقواعد الشرطية والقانونية لشرطة عمان السلطانية ودول العالم. تعرف أعمق التفاصيل عن الأطر القانونية والاختصاص القضائي والتعاون القانوني بين الدول وأنظمة تسليم المجرمين والإنتربول.",
    2: "أنت خبير في العلوم الشرطية والأمن الاستراتيجي، متخصص في الاستشراف الأمني ومكافحة الجريمة المنظمة. أنت ملتم بالقواعد الشرطية لشرطة عمان السلطانية وأجهزة إنفاذ القانون في دول العالم. تعرف أحدث الاستراتيجيات الأمنية والتعاون بين أجهزة إنفاذ القانون والتنبؤ بالتهديدات والأمن الوطني.",
    3: "أنت خبير في العلوم الشرطية والتقنية، متخصص في الأمن السيبراني والذكاء الاصطناعي والتحليل الجنائي الرقمي. أنت ملتم بالقواعد الشرطية لشرطة عمان السلطانية في التعامل مع الجرائم الإلكترونية وقوانين الجرائم السيبرانية في دول العالم. تعرف أحدث التقنيات المستخدمة في مكافحة الجرائم الإلكترونية وجمع الأدلة الرقمية.",
    4: "أنت خبير في العلوم الشرطية والحوكمة والإدارة المؤسسية والرقابة المالية. أنت ملتم بالقواعد الشرطية والإدارية لشرطة عمان السلطانية والأجهزة الحكومية في دول العالم. تعرف أطر الحوكمة الرشيدة ومكافحة الفساد والجرائم المالية العابرة للحدود وغسل الأموال.",
    5: "أنت خبير في العلوم الشرطية والإعلام والمجتمع والتوعية الوقائية. أنت ملتم بالقواعد الشرطية لشرطة عمان السلطانية في التعامل مع الإعلام والمجتمع ومثيلاتها في دول العالم. تعرف دور الإعلام في مكافحة الجرائم وحماية المجتمع وحملات التوعية الرقمية والأمن المجتمعي.",
  };

  const systemPrompt = [
    trackExpertise[trackId] || "أنت خبير في مجال المؤتمر العلمي.",
    "",
    "أنت الآن في المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود",
    "أكاديمية السلطان قابوس لعلوم الشرطة",
    "",
    `المحور المختار: ${trackTitle}`,
    `موضوع المحور: ${trackSubtitle}`,
    "",
    "مهمتك: إعادة صياغة سؤال الجمهور ليكون:",
    "1. سؤالاً علمياً دقيقاً يعكس عمق المعرفة بالمحور",
    "2. موجهاً لخبير أو رئيس الجلسة بشكل احترافي",
    "3. واضحاً ومحدداً بحيث يحصل السائل على إجابة مفيدة",
    "4. مرتبطاً ارتباطاً مباشراً بموضوع المحور",
    "5. مبتكراً يفتح نقاشاً علمياً جاداً",
    "",
    "قواعد الصياغة:",
    "- استخدم مصطلحات علمية دقيقة تناسب المحور",
    "- اجعل السؤال في جملة أو جملتين كحد أقصى",
    "- حافظ على نية السائل الأصلية لكن ارتقِ بها",
    "- أضف بُعداً تحليلياً أو مقارناً إن أمكن",
    "- أجب باللغة العربية الفصحى",
    "- لا تضف معلومات كاذبة أو افتراضات غير موجودة في السؤال",
    "",
    "أعد الصياغة فقط بدون مقدمات أو شروح.",
  ].join("\n");

  const buildResult = (refined: string) => ({
    refined,
    note: refined === question
      ? "سؤالك واضح وجاهز للإرسال"
      : "تم تحسين صياغة سؤالك — يمكنك استخدام النسخة المحسنة أو الأصلية",
  });

  // ── 1. Try z-ai SDK (works locally) ──
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });
    const refined = completion.choices[0]?.message?.content?.trim();
    if (refined) return NextResponse.json(buildResult(refined));
  } catch {}

  // ── 2. Try z-ai REST API (works on Vercel with env vars) ──
  const zaiBaseUrl = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
  const zaiApiKey = process.env.ZAI_API_KEY || "Z.ai";
  const zaiChatId = process.env.ZAI_CHAT_ID || "";
  const zaiUserId = process.env.ZAI_USER_ID || "";
  const zaiToken = process.env.ZAI_TOKEN || "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zaiApiKey}`,
      "X-Z-AI-From": "Z",
    };
    if (zaiChatId) headers["X-Chat-Id"] = zaiChatId;
    if (zaiUserId) headers["X-User-Id"] = zaiUserId;
    if (zaiToken) headers["X-Token"] = zaiToken;

    const res = await fetch(`${zaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "glm-4.6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        thinking: { type: "disabled" },
        temperature: 0.4,
        max_tokens: 300,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const refined = data?.choices?.[0]?.message?.content?.trim();
      if (refined) return NextResponse.json(buildResult(refined));
    }
  } catch {}

  const body: ApiErrorPayload = { error: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى." };
  return NextResponse.json(body, { status: 503 });
}
