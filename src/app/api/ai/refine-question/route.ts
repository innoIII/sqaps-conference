import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

interface RefineRequest {
  question?: unknown;
  trackId?: unknown;
  paperSlot?: unknown;
}

/**
 * POST /api/ai/refine-question
 *
 * Custom AI Agent — reads the selected track + paper (from DB) and refines
 * the audience question based on the paper's topic, researcher, and track expertise.
 *
 * The AI is context-aware:
 *   - If a paper is selected → it knows the paper title + researcher
 *   - If general → it uses the track's expertise
 *   - Track titles/subtitles are dynamic (from DB, editable by admin)
 *
 * Uses Claude (primary) + z-ai (fallback).
 */
export async function POST(request: Request) {
  let trackId: number;
  let question: string;
  let paperSlot: number | undefined;

  try {
    const json = (await request.json()) as RefineRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    question = String(json.question ?? "").trim();
    paperSlot = json.paperSlot ? parseInt(String(json.paperSlot), 10) : undefined;
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

  // ── Gather dynamic context from DB ──
  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  // Fetch session papers to get the selected paper's details.
  const { session, papers } = await getTrackSession(trackId);
  const selectedPaper = paperSlot
    ? papers.find((p) => p.slot === paperSlot)
    : null;

  // ── Build context-aware system prompt ──
  const contextParts: string[] = [
    "أنت مساعد ذكي خبير في العلوم الشرطية، تعمل في المؤتمر العلمي الدولي الثالث",
    "«الجرائم العابرة للحدود» — أكاديمية السلطان قابوس لعلوم الشرطة.",
    "",
    `المحور المختار: ${trackTitle}`,
    `موضوع المحور: ${trackSubtitle}`,
  ];

  // Add session info if available.
  if (session.chair) contextParts.push(`رئيس الجلسة: ${session.chair}`);
  if (session.time) contextParts.push(`التوقيت: ${session.time}`);

  // Add paper context if a specific paper is selected.
  if (selectedPaper && (selectedPaper.title || selectedPaper.researcher)) {
    contextParts.push("");
    contextParts.push("=== الورقة البحثية المختارة ===");
    if (selectedPaper.title) contextParts.push(`العنوان: ${selectedPaper.title}`);
    if (selectedPaper.researcher) contextParts.push(`الباحث: ${selectedPaper.researcher}`);
    contextParts.push("");
    contextParts.push("السؤال موجه لهذه الورقة تحديداً. اجعل الصياغة مرتبطة بموضوع الورقة.");
  } else {
    contextParts.push("");
    contextParts.push("السؤال عام عن المحور. اجعل الصياغة شاملة لجميع الأوراق في المحور.");
  }

  // Add track-specific expertise.
  const trackExpertise: Record<number, string> = {
    1: "أنت ملتم بالقواعد الشرطية والقانونية لشرطة عمان السلطانية ودول العالم: التشريعات الجنائية، الاتفاقيات الدولية، الاختصاص القضائي، تسليم المجرمين، الإنتربول.",
    2: "أنت ملتم بالاستشراف الأمني، مكافحة الجريمة المنظمة، التعاون بين أجهزة إنفاذ القانون، التنبؤ بالتهديدات، الأمن الوطني.",
    3: "أنت ملتم بالأمن السيبراني، الذكاء الاصطناعي، التحليل الجنائي الرقمي، جمع الأدلة الرقمية، الجرائم الإلكترونية.",
    4: "أنت ملتم بالحوكمة الرشيدة، مكافحة الفساد، الجرائم المالية العابرة للحدود، غسل الأموال، الرقابة المؤسسية.",
    5: "أنت ملتم بدور الإعلام في مكافحة الجرائم، التوعية الوقائية، حماية المجتمع، الأمن المجتمعي، الحملات الرقمية.",
  };
  if (trackExpertise[trackId]) {
    contextParts.push("");
    contextParts.push(trackExpertise[trackId]);
  }

  // Add instructions.
  contextParts.push("");
  contextParts.push("مهمتك: إعادة صياغة سؤال الجمهور ليكون:");
  contextParts.push("1. سؤالاً علمياً دقيقاً يعكس عمق المعرفة");
  contextParts.push("2. موجهاً للباحث أو رئيس الجلسة بشكل احترافي");
  contextParts.push("3. واضحاً ومحدداً للحصول على إجابة مفيدة");
  contextParts.push("4. مرتبطاً بموضوع الورقة (إن اختيرت ورقة محددة)");
  contextParts.push("5. مبتكراً يفتح نقاشاً علمياً");
  contextParts.push("");
  contextParts.push("قواعد الصياغة:");
  contextParts.push("- استخدم مصطلحات علمية دقيقة");
  contextParts.push("- اجعل السؤال في جملة أو جملتين كحد أقصى");
  contextParts.push("- حافظ على نية السائل الأصلية لكن ارتقِ بها");
  contextParts.push("- أضف بُعداً تحليلياً أو مقارناً إن أمكن");
  contextParts.push("- أجب باللغة العربية الفصحى");
  contextParts.push("- لا تختلق معلومات غير موجودة في السؤال");
  contextParts.push("");
  contextParts.push("أعد الصياغة فقط بدون مقدمات أو شروح.");

  const systemPrompt = contextParts.join("\n");

  const buildResult = (refined: string) => ({
    refined,
    note: refined === question
      ? "سؤالك واضح وجاهز للإرسال"
      : "تم تحسين صياغة سؤالك — يمكنك استخدام النسخة المحسنة أو الأصلية",
  });

  // ── 1. Claude (primary) ──
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey) {
    try {
      const client = new Anthropic({ apiKey: claudeKey });
      const message = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      });
      const refined = message.content[0]?.type === "text"
        ? message.content[0].text.trim()
        : "";
      if (refined) {
        return NextResponse.json(buildResult(refined));
      }
    } catch {}
  }

  // ── 2. z-ai REST API (hardcoded config — works on Vercel) ──
  try {
    const zaiBaseUrl = "https://internal-api.z.ai/v1";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: "Bearer Z.ai",
      "X-Z-AI-From": "Z",
    };
    const chatId = process.env.ZAI_CHAT_ID || "chat-fae624ef-7681-495c-931f-847ca0ae58ad";
    const userId = process.env.ZAI_USER_ID || "92cc2b60-655b-4f0a-8b6d-387a9c1f94c8";
    const token = process.env.ZAI_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTJjYzJiNjAtNjU1Yi00ZjBhLThiNmQtMzg3YTljMWY5NGM4IiwiY2hhdF9pZCI6ImNoYXQtZmFlNjI0ZWYtNzY4MS00OTVjLTkzMWYtODQ3Y2EwYWU1OGFkIiwicGxhdGZvcm0iOiJ6YWkifQ.OB2GIUb-oi4bzRvgqz_7ONwNaFup1Ao7vFLq43WxXNc";
    if (chatId) headers["X-Chat-Id"] = chatId;
    if (userId) headers["X-User-Id"] = userId;
    if (token) headers["X-Token"] = token;

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
        max_tokens: 150,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const refined = data?.choices?.[0]?.message?.content?.trim();
      if (refined) {
        return NextResponse.json(buildResult(refined));
      }
    }
  } catch {}

  // ── 3. z-ai SDK (last resort — may work if config file exists) ──
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
    if (refined) {
      return NextResponse.json(buildResult(refined));
    }
  } catch {}

  const body: ApiErrorPayload = { error: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى." };
  return NextResponse.json(body, { status: 503 });
}
