import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import { generateCompletion } from "@/lib/ai";
import { db } from "@/lib/db";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface GenerateReportRequest {
  trackId?: unknown;
  notes?: unknown;
  paperSlot?: unknown;
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
  let paperSlot: number | undefined;

  try {
    const json = (await request.json()) as GenerateReportRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    notes = String(json.notes ?? "").trim();
    paperSlot = json.paperSlot ? parseInt(String(json.paperSlot), 10) : undefined;
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

  // ── Read PDF content from DB for each paper (or just the selected one) ──
  const papersToAnalyze = paperSlot
    ? papers.filter((p) => p.slot === paperSlot)
    : papers;
  const papersWithContent: { slot: number; title?: string; researcher?: string; paperText?: string }[] = [];
  for (const paper of papersToAnalyze) {
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

  // Build papers context with FULL PDF content.
  const papersContext = papersWithContent
    .map((p) => {
      const parts = [`الورقة ${p.slot}:`];
      if (p.title) parts.push(`  العنوان: ${p.title}`);
      if (p.researcher) parts.push(`  الباحث: ${p.researcher}`);
      if (p.paperText && !p.paperText.startsWith("(")) {
        parts.push(`  === محتوى الورقة الكامل ===`);
        parts.push(p.paperText);
        parts.push(`  === نهاية المحتوى ===`);
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
    "مهمتك: كتابة تقرير علمي شامل ومفصل عن جلسة مؤتمر.",
    "تقريرك يجب أن يكون طويلاً ومفهوماً ومتعمقاً — لا تكتب ملخصاً مختصراً.",
    "",
    "اقرأ بعناية:",
    "1. محتوى كل ورقة بحثية (مستخرج من PDF) — حلله بعمق",
    "2. ملاحظات رئيس الجلسة — ادمجها في التحليل",
    "3. بيانات الجلسة — استخدمها في المقدمة",
    "",
    "يجب أن يتضمن التقرير الأقسام التالية بالتفصيل:",
    "",
    "## أولاً: مقدمة الجلسة",
    "- تعريف بالمحور وأهميته العلمية والعملية",
    "- سياق الجلسة ضمن المؤتمر",
    "- أسماء الباحثين المشاركين",
    "",
    "## ثانياً: تحليل الأوراق البحثية",
    "لكل ورقة اكتب:",
    "- عنوان الورقة واسم الباحث",
    "- الإشكالية البحثية والهدف من الورقة",
    "- المنهجية المتبعة (إن ذُكرت في المحتوى)",
    "- أبرز النتائج والاستنتاجات",
    "- نقاط القوة في الورقة",
    "- الملاحظات والانتقادات البناءة",
    "- الارتباط بمحور المؤتمر",
    "",
    "## ثالثاً: النقاشات والملاحظات",
    "- تلخيص النقاشات التي دارت (بناءً على ملاحظات رئيس الجلسة)",
    "- أبرز الأسئلة المطروحة",
    "- ردود الباحثين (إن ذُكرت)",
    "",
    "## رابعاً: التوصيات",
    "- توصيات علمية مستخلصة من الأوراق",
    "- توصيات عملية للجهات المعنية",
    "- مقترحات لبحوث مستقبلية",
    "",
    "## خامساً: التقييم العام",
    "- تقييم مستوى الأوراق",
    "- تقييم المناقشات",
    "- تقييم تنظيم الجلسة",
    "- ملاحظات ختامية",
    "",
    "القواعد:",
    "- اكتب باللغة العربية الفصحى",
    "- استخدم أسلوباً رسمياً وعلمياً رصيناً",
    "- اجعل التقرير طويلاً ومفصلاً — لا تختصر",
    "- استخدم العناوين الفرعية المذكورة أعلاه",
    "- إذا توفر محتوى PDF، حلله بعمق واستشهد منه",
    "- إذا لم تتوفر معلومات، اذكر ذلك بوضوح",
    "- لا تختلق معلومات غير موجودة",
    "- ادمج ملاحظات رئيس الجلسة بشكل عضوي في التقرير",
    "- اجعل كل قسم غنياً بالمحتوى (٣-٥ أسطر على الأقل لكل نقطة)",
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

  // ── Generate via the centralized AI layer (Claude → z-ai REST → z-ai SDK) ──
  try {
    const result = await generateCompletion({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 4000,
      temperature: 0.5,
      timeoutMs: 55000,
    });
    return NextResponse.json({
      report: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (e) {
    const body: ApiErrorPayload = {
      error:
        e instanceof Error
          ? e.message
          : "تعذر توليد التقرير. حاول مرة أخرى.",
    };
    return NextResponse.json(body, { status: 503 });
  }
}
