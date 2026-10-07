import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

interface GenerateReportRequest {
  trackId?: unknown;
  notes?: unknown;
}

/**
 * POST /api/ai/generate-report
 *
 * AI Agent for session chairs — generates a professional session report
 * based on:
 *   - Session info (time / venue / chair / secretary)
 *   - Research papers (titles + researchers)
 *   - Chair's manual notes
 *
 * The AI reads all this context and produces a structured Arabic report.
 *
 * Uses z-ai-web-dev-sdk (free, stable, works everywhere).
 *
 * Body: { trackId: number, notes?: string }
 * Returns: { report: string }
 */
export async function POST(request: Request) {
  let trackId: number;
  let notes: string;

  try {
    const json = (await request.json()) as GenerateReportRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    notes = String(json.notes ?? "").trim();
  } catch {
    const body: ApiErrorPayload = { error: "طلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 400 });
  }

  // Gather all session data.
  const { session, papers } = await getTrackSession(trackId);
  const existingReport = await getSessionReport(trackId);
  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  // Build context for the AI.
  const papersContext = papers
    .map((p, i) => {
      const parts = [`الورقة ${i + 1}:`];
      if (p.title) parts.push(`  العنوان: ${p.title}`);
      if (p.researcher) parts.push(`  الباحث: ${p.researcher}`);
      if (p.paperUrl) parts.push(`  متاحة للتحميل: نعم`);
      return parts.join("\n");
    })
    .join("\n\n");

  const sessionContext = [
    `المحور: ${trackTitle}`,
    `الموضوع: ${trackSubtitle}`,
    session.time ? `التوقيت: ${session.time}` : "",
    session.venue ? `المكان: ${session.venue}` : "",
    session.chair ? `رئيس الجلسة: ${session.chair}` : "",
    session.secretary ? `مقرر الجلسة: ${session.secretary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "أنت خبير في العلوم الشرطية ومحرر تقارير علمية محترف.",
    "تعمل في المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود",
    "أكاديمية السلطان قابوس لعلوم الشرطة.",
    "",
    "مهمتك: كتابة تقرير احترافي عن جلسة مؤتمر بناءً على البيانات المتاحة.",
    "",
    "يجب أن يتضمن التقرير:",
    "1. مقدمة عن الجلسة ومحورها",
    "2. ملخص عن كل ورقة بحثية مقدمة",
    "3. أبرز النقاشات والملاحظات",
    "4. التوصيات والاستنتاجات",
    "5. تقييم عام للجلسة",
    "",
    "القواعد:",
    "- اكتب باللغة العربية الفصحى",
    "- استخدم أسلوباً رسمياً وعلمياً",
    "- إذا لم تتوفر معلومات عن ورقة معينة، اذكر ذلك",
    "- ادمج ملاحظات رئيس الجلسة في التقرير",
    "- اجعل التقرير منظماً بعناوين فرعية",
    "- لا تختلق معلومات غير موجودة",
  ].join("\n");

  const userMessage = [
    "اكتب تقريراً احترافياً عن هذه الجلسة:",
    "",
    "=== بيانات الجلسة ===",
    sessionContext,
    "",
    "=== الأوراق البحثية ===",
    papersContext || "لا توجد أوراق بحثية مسجلة",
    "",
    "=== ملاحظات رئيس الجلسة ===",
    notes || existingReport?.content || "لا توجد ملاحظات",
  ].join("\n");

  // ── Try z-ai SDK ──
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      thinking: { type: "disabled" },
    });
    const report = completion.choices[0]?.message?.content?.trim();
    if (report) {
      return NextResponse.json({ report });
    }
  } catch {}

  // ── Try z-ai REST API ──
  try {
    const zaiBaseUrl = "https://internal-api.z.ai/v1";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer Z.ai`,
      "X-Z-AI-From": "Z",
    };
    if (process.env.ZAI_CHAT_ID) headers["X-Chat-Id"] = process.env.ZAI_CHAT_ID;
    if (process.env.ZAI_USER_ID) headers["X-User-Id"] = process.env.ZAI_USER_ID;
    if (process.env.ZAI_TOKEN) headers["X-Token"] = process.env.ZAI_TOKEN;

    const res = await fetch(`${zaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "glm-4.6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        thinking: { type: "disabled" },
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const report = data?.choices?.[0]?.message?.content?.trim();
      if (report) {
        return NextResponse.json({ report });
      }
    }
  } catch {}

  const body: ApiErrorPayload = { error: "تعذر توليد التقرير. حاول مرة أخرى." };
  return NextResponse.json(body, { status: 503 });
}
