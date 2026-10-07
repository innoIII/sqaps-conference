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

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/** Lightweight PDF text extractor (same as generate-report). */
function extractPdfText(base64Data: string): string {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const raw = buffer.toString("latin1");
    const texts: string[] = [];
    const regex = /\(([^)]*)\)\s*Tj/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      if (match[1] && match[1].trim()) texts.push(match[1].trim());
    }
    const btRegex = /BT\s+(.*?)\s+ET/gs;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[1];
      const tjMatches = block.match(/\(([^)]*)\)/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const text = tj.replace(/[()]/g, "").trim();
          if (text && text.length > 1) texts.push(text);
        }
      }
    }
    return texts.join(" ").slice(0, 3000) || "(تعذر استخراج النص)";
  } catch {
    return "(تعذر قراءة محتوى PDF)";
  }
}

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages?: unknown;
  trackId?: unknown;
  mode?: unknown; // "report" | "question" | "answer"
  currentReport?: unknown;
  /** For "answer" mode: the audience question to answer. */
  question?: unknown;
  /** For "answer" mode: the paper slot (1..5) the question is about. */
  paperSlot?: unknown;
}

/**
 * POST /api/ai/agent
 *
 * Interactive AI Agent — a multi-turn conversational agent that acts as the
 * "thinker" (المفكر) for both the session chair and the audience.
 *
 * Modes:
 *   - "report":   The chair converses with the agent to refine/edit the
 *                 session report. The agent can rewrite sections, add details,
 *                 change tone, and suggest a full updated report.
 *   - "question": The audience converses with the agent to craft a better
 *                 question before submitting it to the chair.
 *
 * The agent has full context:
 *   - Track title + subtitle (dynamic from DB)
 *   - Session info (time / venue / chair / secretary)
 *   - All research papers (titles + researchers + PDF content)
 *   - The current report text (for "report" mode)
 *   - The full conversation history
 *
 * Response:
 *   { reply: string, suggestedReport?: string, provider: string, model: string }
 *
 * The `suggestedReport` field is present when the agent rewrote the full
 * report — the UI shows an "Apply" button to replace the current report.
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
        .slice(-20); // Keep last 20 messages max (to stay within token limits).
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

  // For "answer" mode: a question text is required (conversation history is optional).
  // For other modes: the conversation history must have at least one user message.
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

  // ── Read PDF content for papers (report mode: all papers; answer mode: specific paper) ──
  let papersContext = "";
  let answerPaperContext = "";
  if (mode === "report") {
    const papersWithContent: string[] = [];
    for (const paper of papers) {
      const parts: string[] = [`الورقة ${paper.slot}:`];
      if (paper.title) parts.push(`  العنوان: ${paper.title}`);
      if (paper.researcher) parts.push(`  الباحث: ${paper.researcher}`);
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
            const text = extractPdfText(file.data);
            if (!text.startsWith("(")) {
              parts.push(`  === محتوى الورقة ===`);
              parts.push(text.slice(0, 1500));
              parts.push(`  === نهاية المحتوى ===`);
            }
          }
        } catch {}
      }
      papersWithContent.push(parts.join("\n"));
    }
    papersContext = papersWithContent.join("\n\n");
  } else if (mode === "answer") {
    // For answer mode, fetch the SPECIFIC paper the question is about.
    const targetSlot = paperSlot && paperSlot > 0 ? paperSlot : undefined;
    // If no specific slot, use the first paper with a title.
    const targetPaper = targetSlot
      ? papers.find((p) => p.slot === targetSlot)
      : papers.find((p) => p.title);
    if (targetPaper) {
      const parts: string[] = [];
      if (targetPaper.title) parts.push(`العنوان: ${targetPaper.title}`);
      if (targetPaper.researcher)
        parts.push(`الباحث: ${targetPaper.researcher}`);
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
            const text = extractPdfText(file.data);
            if (!text.startsWith("(")) {
              parts.push(`=== محتوى الورقة الكامل ===`);
              parts.push(text.slice(0, 4000));
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

  if (mode === "report") {
    systemPrompt = [
      "أنت «المفكّر» — وكيل ذكاء اصطناعي خبير في العلوم الشرطية والقانونية،",
      "تعمل في المؤتمر العلمي الدولي الثالث «الجرائم العابرة للحدود»",
      "بأكاديمية السلطان قابوس لعلوم الشرطة.",
      "",
      "تتابع مع رئيس الجلسة لمساعدته في صياغة وتعديل تقرير الجلسة.",
      "أنت شريك تفكيره — تحلل، تقترح، تعيد الصياغة، وتطوّر التقرير معه.",
      "",
      "=== بيانات الجلسة ===",
      sessionContext,
      "",
      "=== الأوراق البحثية ===",
      papersContext || "لا توجد أوراق بحثية مسجلة",
      "",
      "=== التقرير الحالي ===",
      currentReport || existingReport?.content || "(لا يوجد تقرير بعد — ابدأ بمساعدة الرئيس في كتابته)",
      "=== نهاية التقرير الحالي ===",
      "",
      "قواعد العمل:",
      "1. أنت شريك تفكير — ناقش، اقترح، واطرح أسئلة استيضاحية عند الحاجة.",
      "2. عندما يطلب الرئيس تعديلاً، اعرض النص المعدّل بشكل واضح.",
      "3. إذا أعدت صياغة التقرير كاملاً، ابدأ الإجابة بـ: «[تقرير محدّث]» ثم",
      "   اكتب التقرير الجديد كاملاً. سيتعرف النظام على هذا ويعرضه للرئيس.",
      "4. إذا عدّلت قسمًا معينًا فقط، اكتب: «[تعديل قسم: عنوان القسم]» ثم النص.",
      "5. حافظ على الأسلوب العلمي الرصين بالعربية الفصحى.",
      "6. استند إلى محتوى الأوراق البحثية عند التحليل.",
      "7. لا تختلق معلومات غير موجودة.",
      "8. كن مختصرًا في نقاشك، ومفصلاً في التقرير.",
      "",
      "تذكّر: أنت المفكّر، والرئيس هو صاحب القرار. قدّم خياراته، لا أوامر.",
    ].join("\n");
  } else if (mode === "question") {
    // question mode
    systemPrompt = [
      "أنت «المفكّر» — وكيل ذكاء اصطناعي خبير في العلوم الشرطية والقانونية،",
      "تعمل في المؤتمر العلمي الدولي الثالث «الجرائم العابرة للحدود»",
      "بأكاديمية السلطان قابوس لعلوم الشرطة.",
      "",
      "تتابع مع الجمهور لمساعدتهم في صياغة أسئلتهم قبل إرسالها لرئيس الجلسة.",
      "",
      "=== بيانات المحور ===",
      sessionContext,
      "",
      "قواعد العمل:",
      "1. ساعد السائل في صياغة سؤال علمي دقيق وواضح.",
      "2. اطرح أسئلة استيضاحية إذا كان السؤال عامًا (مثل: «هل تقصد X أم Y؟»).",
      "3. عندما تصل لصياغة نهائية، ابدأ بـ: «[سؤال جاهز]» ثم السؤال.",
      "4. كن مختصرًا وودودًا — الجمهور ليسوا متخصصين بالضرورة.",
      "5. استخدم العربية الفصحى المبسطة.",
      "6. لا تختلق معلومات — اعتمد على ما قاله السائل.",
      "7. اجعل السؤال موجّهًا لموضوع المحور تحدِيدًا.",
      "",
      "تذكّر: أنت تساعد السائل على التعبير عن فكرته بوضوح علمي.",
    ].join("\n");
  } else {
    // answer mode — the chair asked the agent to answer an audience question
    // based on the research paper's content.
    systemPrompt = [
      "أنت «المفكّر» — وكيل ذكاء اصطناعي خبير في العلوم الشرطية والقانونية،",
      "تعمل في المؤتمر العلمي الدولي الثالث «الجرائم العابرة للحدود»",
      "بأكاديمية السلطان قابوس لعلوم الشرطة.",
      "",
      "طلب منك رئيس الجلسة الإجابة على سؤال طرحه الجمهور، بناءً على محتوى",
      "الورقة البحثية المقدمة في الجلسة. مهمتك:",
      "  1. تحليل السؤال بدقة.",
      "  2. البحث في محتوى الورقة البحثية عن الإجابة.",
      "  3. صياغة إجابة علمية رصينة تستند إلى ما ورد في الورقة.",
      "  4. إذا لم تكن الإجابة موجودة في الورقة، اذكر ذلك بصراحة.",
      "",
      "=== بيانات الجلسة ===",
      sessionContext,
      "",
      "=== الورقة البحثية ===",
      answerPaperContext || "(لا توجد ورقة بحثية متاحة)",
      "",
      "قواعد الإجابة:",
      "1. ابدأ بفقرة موجزة (سطرين) تلخص الإجابة المباشرة.",
      "2. ثم اشرح بالتفصيل مع الاستشهاد بمحتوى الورقة.",
      "3. استخدم العربية الفصحى العلمية.",
      "4. كن دقيقًا — لا تختلق معلومات غير موجودة في الورقة.",
      "5. إذا كان السؤال عامًا وغير مرتبط بالورقة، أجب من معرفتك العامة",
      "   بشرط الإشارة إلى أن الإجابة من المعرفة العامة وليس من الورقة.",
      "6. اجعل الإجابة بين 150 و 400 كلمة.",
      "7. لا تستخدم علامات أو رموز خاصة — اكتب نصًا عاديًا.",
      "",
      "تذكّر: أنت تساعد رئيس الجلسة على الرد على الجمهور بمعلومات موثقة.",
    ].join("\n");
  }

  // ── Build the user message ──
  // For "answer" mode: the user message is the audience question itself.
  // For "report" / "question" modes: serialize the conversation history.
  let userMessage: string;
  let maxTokens: number;

  if (mode === "answer") {
    userMessage = [
      "=== سؤال الجمهور ===",
      questionText || "(لم يُحدد سؤال)",
      "",
      "أجب على هذا السؤال بناءً على محتوى الورقة البحثية المرفق في السياق.",
    ].join("\n");
    maxTokens = 1500;
  } else {
    userMessage = messages
      .map((m) => {
        const speaker = m.role === "user" ? "الإنسان" : "المفكّر";
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");
    maxTokens = mode === "report" ? 4000 : 800;
  }

  // ── Generate via the centralized AI layer ──
  try {
    const result = await generateCompletion({
      system: systemPrompt,
      user: userMessage,
      maxTokens,
      temperature: 0.5,
      timeoutMs: 55000,
    });

    const reply = result.text;

    // Extract suggested report/question if the agent used the marker.
    let suggestedReport: string | undefined;
    let suggestedQuestion: string | undefined;
    // For "answer" mode, the entire reply IS the answer.
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
      // The entire reply is the answer (no markers expected).
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
