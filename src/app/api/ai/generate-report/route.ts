import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import { generateCompletion } from "@/lib/ai";
import { db } from "@/lib/db";
import type { ApiErrorPayload } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 55;

interface GenerateReportRequest {
  trackId?: unknown;
  notes?: unknown;
  paperSlot?: unknown;
}

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return (
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://") ||
    url.startsWith("file:")
  );
}

/**
 * Extract text from a base64-encoded PDF using pdf-parse.
 */
async function extractPdfText(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

/**
 * POST /api/ai/generate-report
 *
 * Generates a professional session report as a conference secretary would.
 * Reads PDF content via pdf-parse for accurate text extraction.
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

  const { session, papers } = await getTrackSession(trackId);
  const existingReport = await getSessionReport(trackId);
  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);

  // ── Read PDF content ──
  const papersToAnalyze = paperSlot
    ? papers.filter((p) => p.slot === paperSlot)
    : papers;

  const papersWithContent: {
    slot: number;
    title?: string;
    researcher?: string;
    paperText?: string;
  }[] = [];

  for (const paper of papersToAnalyze) {
    let paperText: string | undefined;
    if (paper.paperUrl && dbAvailable()) {
      try {
        const file = await db.paperFile.findUnique({
          where: {
            trackId_slot_fileType: {
              trackId,
              slot: paper.slot,
              fileType: "paper",
            },
          },
        });
        if (file) {
          paperText = await extractPdfText(file.data);
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
      if (p.researcher)
        parts.push(`  الباحث: ${p.researcher.split("\n").join("، ")}`);
      if (p.paperText) {
        parts.push(`  === محتوى الورقة ===`);
        parts.push(p.paperText.slice(0, 2000));
        parts.push(`  === نهاية المحتوى ===`);
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
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "أنت أمين سرّ مؤتمر علمي محترف، بخبرة واسعة في العلوم الشرطية والقانونية والأمنية.",
    "تعمل في المؤتمر العلمي الدولي الثالث «الجرائم العابرة للحدود»",
    "بأكاديمية السلطان قابوس لعلوم الشرطة.",
    "",
    "تتميز بـ:",
    "- خبرة عميقة في تقييم الأبحاث العلمية وتحليلها",
    "- معرفة دقيقة بمعايير البحث العلمي الرصين",
    "- قدرة على تحديد المنهجية وتقييم الإشكالية والنتائج",
    "- أسلوب كتابة علمي رسمي خالٍ من الزخارف والرموز",
    "",
    "مهمتك: كتابة تقرير علمي شامل عن جلسة المؤتمر.",
    "",
    "=== بيانات الجلسة ===",
    sessionContext,
    "",
    "=== الأوراق البحثية ومحتواها ===",
    papersContext || "لا توجد أوراق بحثية مسجلة",
    "",
    "=== ملاحظات رئيس الجلسة ===",
    notes || existingReport?.content || "لا توجد ملاحظات",
    "",
    "اكتب التقرير بالشكل التالي:",
    "",
    "أولاً: مقدمة الجلسة",
    "تعريف بالمحور وأهميته العلمية والعملية، وسياق الجلسة ضمن المؤتمر،",
    "وأسماء الباحثين المشاركين.",
    "",
    "ثانياً: تحليل الأوراق البحثية",
    "لكل ورقة: عنوانها، باحثها، الإشكالية البحثية، المنهجية،",
    "أبرز النتائج، نقاط القوة، الملاحظات البناءة، الارتباط بمحور المؤتمر.",
    "",
    "ثالثاً: النقاشات والملاحظات",
    "تلخيص النقاشات، أبرز الأسئلة، ردود الباحثين.",
    "",
    "رابعاً: التوصيات",
    "توصيات علمية مستخلصة، توصيات عملية للجهات المعنية، مقترحات لبحوث مستقبلية.",
    "",
    "خامساً: التقييم العام",
    "تقييم مستوى الأوراق، تقييم المناقشات، ملاحظات ختامية.",
    "",
    "قواعد الكتابة:",
    "- اكتب بأسلوب أمين سرّ محترف — رسمي، دقيق، علمي.",
    "- لا تستخدم أي رموز زخرفية أو نجوم أو رموز خاصة.",
    "- استخدم الترقيم العلمي: أولاً، ثانياً، ثالثاً...",
    "- استند إلى محتوى الأوراق عند التحليل — لا تختلق.",
    "- اجعل التقرير متناسقًا ومنطقيًا.",
  ].join("\n");

  const userMessage = "اكتب تقرير الجلسة كاملاً.";

  try {
    const result = await generateCompletion({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 2000,
      temperature: 0.5,
      timeoutMs: 45000,
    });
    return NextResponse.json({
      report: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (e) {
    const body: ApiErrorPayload = {
      error: e instanceof Error ? e.message : "تعذر توليد التقرير. حاول مرة أخرى.",
    };
    return NextResponse.json(body, { status: 503 });
  }
}
