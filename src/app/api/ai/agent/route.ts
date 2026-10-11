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
 * Much more accurate than the regex-based extractor — handles
 * multi-column layouts, embedded fonts, and modern PDF structures.
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

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages?: unknown;
  trackId?: unknown;
  mode?: unknown;
  currentReport?: unknown;
  question?: unknown;
  paperSlot?: unknown;
}

/**
 * POST /api/ai/agent
 *
 * Interactive AI Agent — acts as a professional conference secretary
 * with expertise in the track's specialization.
 *
 * Modes:
 *   - "report":  The chair converses with the agent to refine/edit the
 *                 session report. Professional academic writing.
 *   - "answer":  The agent answers an audience question based on the
 *                 research paper's content.
 *   - "question": The agent helps craft a better question (removed from /qn).
 */
export async function POST(request: Request) {
  let messages: AgentMessage[] = [];
  let trackId: number;
  let mode: "report" | "question" | "answer" = "report";
  let currentReport = "";
  let questionText = "";
  let paperSlot: number | undefined;

  try {
    const json = (await request.json()) as AgentRequest;
    trackId = parseInt(String(json.trackId ?? "0"), 10);
    const rawMode = String(json.mode ?? "report");
    mode =
      rawMode === "question"
        ? "question"
        : rawMode === "answer"
          ? "answer"
          : "report";
    currentReport = String(json.currentReport ?? "").trim();
    questionText = String(json.question ?? "").trim();
    paperSlot = json.paperSlot
      ? parseInt(String(json.paperSlot), 10)
      : undefined;
    if (Array.isArray(json.messages)) {
      messages = json.messages
        .filter(
          (m): m is AgentMessage =>
            typeof m === "object" &&
            m !== null &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-10); // Keep last 10 messages to save tokens.
    }
  } catch {
    const body: ApiErrorPayload = { error: "طلب غير صالح" };
    return NextResponse.json(body, { status: 400 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    const body: ApiErrorPayload = { error: "المحور غير موجود" };
    return NextResponse.json(body, { status: 400 });
  }

  if (mode === "answer") {
    if (!questionText) {
      const body: ApiErrorPayload = { error: "السؤال مطلوب لوضع الإجابة" };
      return NextResponse.json(body, { status: 400 });
    }
  } else {
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      const body: ApiErrorPayload = { error: "آخر رسالة يجب أن تكون من المستخدم" };
      return NextResponse.json(body, { status: 400 });
    }
  }

  // ── Gather dynamic context from DB ──
  const trackTitle = await getContent(`track.${trackId}.title`);
  const trackSubtitle = await getContent(`track.${trackId}.subtitle`);
  const { session, papers } = await getTrackSession(trackId);
  const existingReport = await getSessionReport(trackId);

  // ── Read PDF content ──
  let papersContext = "";
  let answerPaperContext = "";
  let answerPaperTitle = "";

  if (mode === "report") {
    const papersWithContent: string[] = [];
    for (const paper of papers) {
      const parts: string[] = [`الورقة ${paper.slot}:`];
      if (paper.title) parts.push(`  العنوان: ${paper.title}`);
      if (paper.researcher)
        parts.push(`  الباحث: ${paper.researcher.split("\n").join("، ")}`);
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
            const text = await extractPdfText(file.data);
            if (text) {
              parts.push(`  === محتوى الورقة ===`);
              parts.push(text.slice(0, 2000));
              parts.push(`  === نهاية المحتوى ===`);
            }
          }
        } catch {}
      }
      papersWithContent.push(parts.join("\n"));
    }
    papersContext = papersWithContent.join("\n\n");
  } else if (mode === "answer") {
    const targetSlot = paperSlot && paperSlot > 0 ? paperSlot : undefined;
    const targetPaper = targetSlot
      ? papers.find((p) => p.slot === targetSlot)
      : papers.find((p) => p.title);
    if (targetPaper) {
      answerPaperTitle = targetPaper.title || "";
      const parts: string[] = [];
      if (targetPaper.title) parts.push(`العنوان: ${targetPaper.title}`);
      if (targetPaper.researcher)
        parts.push(`الباحث: ${targetPaper.researcher.split("\n").join("، ")}`);
      if (targetPaper.paperUrl && dbAvailable()) {
        try {
          const file = await db.paperFile.findUnique({
            where: {
              trackId_slot_fileType: {
                trackId,
                slot: targetPaper.slot,
                fileType: "paper",
              },
            },
          });
          if (file) {
            const text = await extractPdfText(file.data);
            if (text) {
              parts.push(`=== محتوى الورقة الكامل ===`);
              parts.push(text.slice(0, 3000));
              parts.push(`=== نهاية المحتوى ===`);
            }
          }
        } catch {}
      }
      answerPaperContext = parts.join("\n");
    }
  }

  // ── Build the system prompt based on mode ──
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

  let systemPrompt: string;
  let userMessage: string;
  let maxTokens: number;

  if (mode === "report") {
    systemPrompt = [
      "أنت أمين سرّ مؤتمر علمي محترف تعمل في المؤتمر العلمي الدولي الثالث",
      "«الجرائم العابرة للحدود» بأكاديمية السلطان قابوس لعلوم الشرطة.",
      "",
      "خبرتك العلمية:",
      "- دراسات عليا في العلوم الجنائية والقانون الدولي والأمن السيبراني",
      "- خبرة عملية في المؤسسات الأمنية والقضائية",
      "- اطلاع واسع على الأدبيات العلمية في مجال الجرائم العابرة للحدود",
      "- معرفة باتفاقيات التعاون الدولي (الإنتربول، الاتفاقيات الثنائية)",
      "- إلمام بالتشريعات الوطنية والدولية لمكافحة الجريمة",
      "- خبرة في تقييم الأبحاث العلمية وفق معايير المراجعة الأكاديمية",
      "",
      "دورك:",
      "تكتب تقرير الجلسة بصفتك أمين سرّ. التقرير ليس ملخصاً بل وثيقة",
      "علمية رسمية تُحفظ في أرشيف المؤتمر وتُنشر في وقائعه.",
      "",
      "فهمك للتخصص:",
      "- من عنوان المحور وموضوعه، تحدد المجال الدقيق (قانوني، أمني،",
      "  تقني، إداري، إعلامي) وتطبّق خبرتك في ذلك المجال",
      "- من عنوان كل ورقة، تفهم الإشكالية البحثية وتقيّمها بمعايير ذلك التخصص",
      "- تستخدم المصطلحات الفنية الدقيقة لكل تخصص",
      "- تقارن النتائج بالأطر النظرية المعتمدة في المجال",
      "",
      "=== بيانات الجلسة ===",
      sessionContext,
      "",
      "=== الأوراق البحثية ومحتواها ===",
      papersContext || "لا توجد أوراق بحثية مسجلة",
      "",
      "=== التقرير الحالي ===",
      currentReport || existingReport?.content || "(لا يوجد تقرير بعد)",
      "=== نهاية التقرير الحالي ===",
      "",
      "معايير الكتابة العلمية:",
      "1. اكتب بأسلوب رسمي مباشر. الجمل قصيرة ومحددة. لا حشو ولا تكرار.",
      "2. ممنوع تماماً: النجوم، الرموز الزخرفية، علامات التعجب المتعددة،",
      "   الإيموجي، أو أي زخرفة. النص نظيف فقط.",
      "3. استخدم الترقيم: أولاً: / ثانياً: / ثالثاً: (بدون علامات #).",
      "4. لكل ورقة اكتب فقرة واحدة متماسكة تتضمن: الإشكالية، المنهجية،",
      "   النتائج، التقييم النقدي البناء.",
      "5. التقييم النقدي: اذكر نقاط القوة ثم الملاحظات بصياغة مهنية.",
      "6. استند فقط إلى المحتوى المرفق. لا تختلق معلومات أو نتائج.",
      "7. إذا أعدت صياغة التقرير كاملاً، ابدأ بـ: [تقرير محدّث] ثم",
      "   اكتب النص كاملاً بدون أي مقدمة خارجية.",
      "8. إذا عدّلت قسمًا محدداً، اكتب: [تعديل قسم: الاسم] ثم النص.",
      "9. لا تكتب عبارات مثل «إليك التقرير» أو «بكل سرور». اكتب النص مباشرة.",
      "",
      "الرئيس هو صاحب القرار. أنت المنفّذ الخبير.",
    ].join("\n");

    userMessage = messages
      .map((m) => {
        const speaker = m.role === "user" ? "الرئيس" : "أمين السر";
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");
    maxTokens = 2000;
  } else if (mode === "question") {
    systemPrompt = [
      "أنت أمين سرّ مؤتمر علمي محترف.",
      "تساعد الجمهور في صياغة أسئلة علمية دقيقة.",
      "",
      "=== بيانات المحور ===",
      sessionContext,
      "",
      "قواعد العمل:",
      "1. ساعد السائل في صياغة سؤال علمي دقيق.",
      "2. اطرح أسئلة استيضاحية إذا كان السؤال عامًا.",
      "3. عند الوصول لصياغة نهائية، ابدأ بـ: [سؤال جاهز] ثم السؤال.",
      "4. استخدم العربية الفصحى المبسطة بدون زخارف.",
    ].join("\n");

    userMessage = messages
      .map((m) => {
        const speaker = m.role === "user" ? "السائل" : "أمين السر";
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");
    maxTokens = 500;
  } else {
    // answer mode
    systemPrompt = [
      "أنت أمين سرّ مؤتمر علمي محترف، بخبرة في العلوم الشرطية والقانونية.",
      "طلب منك رئيس الجلسة الإجابة على سؤال الجمهور بناءً على محتوى الورقة.",
      "",
      "=== بيانات الجلسة ===",
      sessionContext,
      "",
      "=== الورقة البحثية ===",
      answerPaperContext || "(لا توجد ورقة بحثية متاحة)",
      "",
      "قواعد الإجابة:",
      "1. ابدأ بفقرة موجزة تلخص الإجابة المباشرة.",
      "2. اشرح بالتفصيل مستندًا إلى محتوى الورقة.",
      "3. إذا لم تكن الإجابة في الورقة، اذكر ذلك بصراحة.",
      "4. اكتب بأسلوب علمي مباشر بدون رموز أو زخارف.",
      "5. اجعل الإجابة بين ١٠٠ و ٣٠٠ كلمة.",
    ].join("\n");

    userMessage = [
      "=== سؤال الجمهور ===",
      questionText || "(لم يُحدد سؤال)",
      "",
      "أجب على هذا السؤال بناءً على محتوى الورقة البحثية.",
    ].join("\n");
    maxTokens = 800;
  }

  // ── Generate via DeepSeek ──
  try {
    const result = await generateCompletion({
      system: systemPrompt,
      user: userMessage,
      maxTokens,
      temperature: 0.5,
      timeoutMs: 45000,
    });

    const reply = result.text;

    let suggestedReport: string | undefined;
    let suggestedQuestion: string | undefined;
    let answer: string | undefined;

    if (mode === "report") {
      const reportMatch = reply.match(/\[تقرير محدّث\]\s*([\s\S]*?)(?:\n\[|$)/);
      if (reportMatch && reportMatch[1] && reportMatch[1].trim().length > 50) {
        suggestedReport = reportMatch[1].trim();
      }
    } else if (mode === "question") {
      const qMatch = reply.match(/\[سؤال جاهز\]\s*([\s\S]*?)(?:\n\n|$)/);
      if (qMatch && qMatch[1] && qMatch[1].trim().length > 5) {
        suggestedQuestion = qMatch[1].trim();
      }
    } else if (mode === "answer") {
      answer = reply.trim();
    }

    return NextResponse.json({
      reply,
      suggestedReport,
      suggestedQuestion,
      answer,
      provider: result.provider,
      model: result.model,
    });
  } catch (e) {
    const body: ApiErrorPayload = {
      error:
        e instanceof Error
          ? e.message
          : "تعذر الاتصال بالوكيل الذكي. حاول مرة أخرى.",
    };
    return NextResponse.json(body, { status: 503 });
  }
}
