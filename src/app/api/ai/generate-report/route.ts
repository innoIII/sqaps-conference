import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import { db } from "@/lib/db";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface GenerateReportRequest {
  trackId?: unknown;
  notes?: unknown;
}

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * Extracts text from a base64-encoded PDF using a simple approach:
 * reads the raw bytes and extracts text between BT/ET markers.
 * This is a lightweight extractor — for complex PDFs it may miss content,
 * but it's enough for the AI to get context.
 */
function extractPdfText(base64Data: string): string {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const raw = buffer.toString("latin1");

    // Extract text between parentheses in Tj/TJ operators.
    const texts: string[] = [];
    const regex = /\(([^)]*)\)\s*Tj/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      if (match[1] && match[1].trim()) {
        texts.push(match[1].trim());
      }
    }

    // Also try BT...ET blocks.
    const btRegex = /BT\s+(.*?)\s+ET/gs;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[1];
      const tjMatches = block.match(/\(([^)]*)\)/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const text = tj.replace(/[()]/g, "").trim();
          if (text && text.length > 1) {
            texts.push(text);
          }
        }
      }
    }

    const result = texts.join(" ").slice(0, 3000); // Cap at 3000 chars for AI.
    return result || "(تعذر استخراج النص — قد يكون PDF ممسوحاً ضوئياً)";
  } catch {
    return "(تعذر قراءة محتوى PDF)";
  }
}

/**
 * POST /api/ai/generate-report
 *
 * AI Agent for session chairs — generates a professional session report.
 *
 * Reads:
 *   - Session info (time / venue / chair / secretary)
 *   - Research papers (titles + researchers + PDF content if uploaded)
 *   - Chair's manual notes
 *
 * Uses Claude (primary) + z-ai (fallback).
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

  // Gather session data.
  const { session, papers } = await getTrackSession(trackId);
  const existingReport = await getSessionReport(trackId);
  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  // ── Read PDF content from DB for each paper ──
  const papersWithContent: { slot: number; title?: string; researcher?: string; paperText?: string }[] = [];
  for (const paper of papers) {
    let paperText: string | undefined;
    if (paper.paperUrl && dbAvailable()) {
      try {
        const file = await db.paperFile.findUnique({
          where: { trackId_slot_fileType: { trackId, slot: paper.slot, fileType: "paper" } },
        });
        if (file) {
          paperText = extractPdfText(file.data);
        }
      } catch {}
    }
    papersWithContent.push({
      slot: paper.slot,
      title: paper.title,
      researcher: paper.researcher,
      paperText,
    });
  }

  // Build papers context with PDF content.
  const papersContext = papersWithContent
    .map((p) => {
      const parts = [`الورقة ${p.slot}:`];
      if (p.title) parts.push(`  العنوان: ${p.title}`);
      if (p.researcher) parts.push(`  الباحث: ${p.researcher}`);
      if (p.paperText && !p.paperText.startsWith("(")) {
        parts.push(`  محتوى الورقة (ملخص): ${p.paperText.slice(0, 500)}...`);
      } else if (p.paperText) {
        parts.push(`  ${p.paperText}`);
      }
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
  ].filter(Boolean).join("\n");

  const systemPrompt = [
    "أنت خبير في العلوم الشرطية ومحرر تقارير علمية محترف.",
    "تعمل في المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود",
    "أكاديمية السلطان قابوس لعلوم الشرطة.",
    "",
    "مهمتك: كتابة تقرير احترافي عن جلسة مؤتمر بناءً على البيانات المتاحة.",
    "إذا توفر محتوى الأوراق البحثية (مستخرج من PDF)، استخدمه في التقرير.",
    "",
    "يجب أن يتضمن التقرير:",
    "1. مقدمة عن الجلسة ومحورها",
    "2. ملخص عن كل ورقة بحثية مقدمة (بناءً على محتواها إن توفر)",
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
    "- حلل المحتوى المقدم من PDF بعمق إن توفر",
  ].join("\n");

  const userMessage = [
    "اكتب تقريراً احترافياً عن هذه الجلسة:",
    "",
    "=== بيانات الجلسة ===",
    sessionContext,
    "",
    "=== الأوراق البحثية ومحتواها ===",
    papersContext || "لا توجد أوراق بحثية مسجلة",
    "",
    "=== ملاحظات رئيس الجلسة ===",
    notes || existingReport?.content || "لا توجد ملاحظات",
  ].join("\n");

  // ── 1. Claude (primary) ──
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey) {
    try {
      const client = new Anthropic({ apiKey: claudeKey });
      const message = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      const report = message.content[0]?.type === "text"
        ? message.content[0].text.trim()
        : "";
      if (report) {
        return NextResponse.json({ report });
      }
    } catch {}
  }

  // ── 2. z-ai (fallback) ──
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

  const body: ApiErrorPayload = { error: "تعذر توليد التقرير. حاول مرة أخرى." };
  return NextResponse.json(body, { status: 503 });
}
