import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/tracks";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import { getContent } from "@/lib/site-content-server";
import { generateCompletion } from "@/lib/ai";
import { db } from "@/lib/db";
import { loadDossier, dossierToText } from "@/lib/paper-knowledge";
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
 * Detect the user's intent from their last message.
 * This lets us pick the best system prompt + maxTokens.
 *
 * Supported intents (in report mode):
 *   - "generate"  : توليد تقرير شامل من الصفر
 *   - "summarize" : تلخيص التقرير الحالي
 *   - "format"    : تنسيق كوثيقة علمية
 *   - "recommendations" : استخراج التوصيات
 *   - "evaluate"  : تقييم الأوراق
 *   - "chat"      : محادثة عامة / سؤال عابر
 */
type Intent =
  | "generate"
  | "summarize"
  | "format"
  | "recommendations"
  | "evaluate"
  | "chat";

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (
    t.includes("ولّد") ||
    t.includes("ولد") ||
    t.includes("اكتب تقرير") ||
    t.includes("أنشئ تقرير") ||
    t.includes("تقرير شامل") ||
    t.includes("تقرير كامل")
  ) {
    return "generate";
  }
  if (
    t.includes("لخّص") ||
    t.includes("لخص") ||
    t.includes("ملخص") ||
    t.includes("تلخيص") ||
    t.includes("اختصار")
  ) {
    return "summarize";
  }
  if (
    t.includes("نسّق") ||
    t.includes("نسق") ||
    t.includes("تنسيق") ||
    t.includes("وثيقة علمية") ||
    t.includes("أعد تنسيق") ||
    t.includes("اعد تنسيق")
  ) {
    return "format";
  }
  if (
    t.includes("توصيات") ||
    t.includes("استخرج التوصيات") ||
    t.includes("استخراج التوصيات") ||
    t.includes("التوصيات")
  ) {
    return "recommendations";
  }
  if (
    t.includes("قيّم") ||
    t.includes("قيم") ||
    t.includes("تقييم") ||
    t.includes("نقاط القوة") ||
    t.includes("نقاط قوة")
  ) {
    return "evaluate";
  }
  return "chat";
}

/**
 * Fetch audience questions for the track (last 10) to enrich the context.
 * The chair's report should reference the actual questions asked.
 */
async function fetchRecentQuestions(trackId: number): Promise<string> {
  if (!dbAvailable()) return "";
  try {
    const questions = await db.question.findMany({
      where: { trackId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (questions.length === 0) return "";
    const lines = questions.map((q, i) => {
      const time = q.createdAt.toLocaleString("ar", {
        timeZone: "Asia/Muscat",
        dateStyle: "short",
        timeStyle: "short",
      });
      const author = q.author ? ` (${q.author})` : "";
      const slot = q.paperSlot ? ` [ورقة ${q.paperSlot}]` : "";
      return `${i + 1}.${slot}${author} ${q.question} — ${time}`;
    });
    return lines.join("\n");
  } catch {
    return "";
  }
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
 *
 * Algorithm improvements:
 *   1. Intent detection — picks the best system prompt per command.
 *   2. Structured paper extraction — extracts methodology, results,
 *      recommendations, and references separately (not just raw text).
 *   3. Richer context — includes recent audience questions + CV details.
 *   4. More PDF text — 3000 chars for papers, 1500 for CVs.
 *   5. Temperature tuning — 0.3 for format/evaluate (precise),
 *      0.6 for generate/summarize (creative).
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
  const recentQuestions = await fetchRecentQuestions(trackId);

  // ── Read PDF content with structured extraction ──
  let papersContext = "";
  let answerPaperContext = "";
  let answerPaperTitle = "";

  if (mode === "report") {
    // Cards (or the booklet abstract page) for every paper — compact enough
    // for the whole session; the chair asks about one paper for full depth.
    const listed = papers.filter((p) => p.title || p.researcher);
    const dossiers = await Promise.all(listed.map((p) => loadDossier(trackId, p)));
    papersContext = dossiers.map((d) => dossierToText(d, "card")).join("\n\n────────\n\n");
  } else if (mode === "answer") {
    const targetSlot = paperSlot && paperSlot > 0 ? paperSlot : undefined;
    const targetPaper = targetSlot
      ? papers.find((p) => p.slot === targetSlot)
      : papers.find((p) => p.title);
    if (targetPaper) {
      answerPaperTitle = targetPaper.title || "";
      const d = await loadDossier(trackId, targetPaper);
      answerPaperContext = dossierToText(d, "full");
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

  // Questions context (shared by report + answer modes).
  const questionsContext = recentQuestions
    ? `\n\n=== أسئلة الجمهور الأخيرة ===\n${recentQuestions}\n=== نهاية الأسئلة ===`
    : "";

  let systemPrompt: string;
  let userMessage: string;
  let maxTokens: number;
  let temperature = 0.5;

  if (mode === "report") {
    // ── Detect intent from the last user message ──
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const intent = lastUserMsg ? detectIntent(lastUserMsg.content) : "chat";

    // Base persona + context (shared by all intents).
    const baseContext = [
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
      "=== الأوراق البحثية ومحتواها (مع السير الذاتية) ===",
      papersContext || "لا توجد أوراق بحثية مسجلة",
      questionsContext,
      "",
      "=== التقرير الحالي ===",
      currentReport || existingReport?.content || "(لا يوجد تقرير بعد)",
      "=== نهاية التقرير الحالي ===",
    ].join("\n");

    // ── Build intent-specific instructions ──
    let intentInstructions = "";
    if (intent === "generate") {
      intentInstructions = [
        "",
        "=== المهمة: توليد تقرير شامل ===",
        "اكتب تقرير الجلسة كاملاً من البداية بناءً على محتوى الأوراق البحثية",
        "والسير الذاتية وأسئلة الجمهور. اتبع هذا الهيكل:",
        "",
        "أولاً: مقدمة الجلسة — تعريف بالمحور، أهميته، الباحثون المشاركون.",
        "ثانياً: تحليل الأوراق البحثية — لكل ورقة: الإشكالية، المنهجية،",
        "  النتائج، التقييم النقدي البناء القائم على محتوى الورقة وحده.",
        "ثالثاً: النقاشات — تلخيص النقاشات والأسئلة المطروحة من الجمهور.",
        "رابعاً: التوصيات — توصيات علمية وعملية مستفادة من الأوراق.",
        "خامساً: التقييم العام — تقييم مستوى الأوراق والمناقشات.",
        "",
        "ابدأ التقرير بـ: [تقرير محدّث] ثم اكتب النص كاملاً بدون أي مقدمة خارجية.",
      ].join("\n");
      maxTokens = 2500;
      temperature = 0.6;
    } else if (intent === "summarize") {
      intentInstructions = [
        "",
        "=== المهمة: تلخيص التقرير ===",
        "لخّص التقرير الحالي في نقاط مختصرة ومحددة. لكل ورقة:",
        "- سطر واحد للإشكالية",
        "- سطر واحد للنتيجة الرئيسية",
        "- سطر واحد للتقييم",
        "ثم لخّص التوصيات في ٣-٥ نقاط.",
        "ابدأ بـ: [تقرير محدّث] ثم النص المختصر.",
      ].join("\n");
      maxTokens = 1000;
      temperature = 0.4;
    } else if (intent === "format") {
      intentInstructions = [
        "",
        "=== المهمة: تنسيق كوثيقة علمية ===",
        "أعد تنسيق التقرير الحالي كوثيقة علمية رسمية بترقيم علمي",
        "(أولاً، ثانياً، ثالثاً) بدون أي رموز زخرفية أو نجوم أو علامات #.",
        "حافظ على المحتوى كما هو لكن أعد ترتيبه وهيكله بشكل احترافي.",
        "ابدأ بـ: [تقرير محدّث] ثم النص المنسّق.",
      ].join("\n");
      maxTokens = 2000;
      temperature = 0.3;
    } else if (intent === "recommendations") {
      intentInstructions = [
        "",
        "=== المهمة: استخراج التوصيات ===",
        "استخرج جميع التوصيات من التقرير الحالي ومن محتوى الأوراق البحثية.",
        "اعرضها في قائمة مرقمة واضحة، مصنّفة حسب المجال:",
        "- توصيات قانونية",
        "- توصيات أمنية",
        "- توصيات تقنية",
        "- توصيات إدارية",
        "- توصيات مجتمعية",
        "ابدأ بـ: [تقرير محدّث] ثم قائمة التوصيات.",
      ].join("\n");
      maxTokens = 1200;
      temperature = 0.4;
    } else if (intent === "evaluate") {
      intentInstructions = [
        "",
        "=== المهمة: تقييم الأوراق البحثية ===",
        "قيّم كل ورقة بحثية في الجلسة بالتفصيل. لكل ورقة اكتب:",
        "1. نقاط القوة (منهجياً، علمياً، عملياً)",
        "2. الملاحظات البناءة (نقاط الضعف، الفجوات، المقترحات)",
        "3. التقييم العام (ممتاز / جيد جداً / جيد / مقبول)",
        "قيّم كل ورقة بمحتواها وحده، لا برتبة الباحث أو جهته.",
        "للتحكيم المفصّل بالمعايير الثمانية استخدم زر «تحكيم الورقة».",
        "ابدأ بـ: [تقرير محدّث] ثم التقييم التفصيلي.",
      ].join("\n");
      maxTokens = 1500;
      temperature = 0.3;
    } else {
      // chat — general conversation/refinement.
      intentInstructions = [
        "",
        "=== المحادثة التفاعلية ===",
        "أنت في وضع المحادثة مع رئيس الجلسة. رد على طلبه بدقة.",
        "معايير الكتابة العلمية:",
        "1. اكتب بأسلوب رسمي مباشر. الجمل قصيرة ومحددة. لا حشو ولا تكرار.",
        "2. ممنوع تماماً: النجوم، الرموز الزخرفية، علامات التعجب المتعددة،",
        "   الإيموجي، أو أي زخرفة. النص نظيف فقط.",
        "3. استخدم الترقيم: أولاً: / ثانياً: / ثالثاً: (بدون علامات #).",
        "4. استند فقط إلى المحتوى المرفق. لا تختلق معلومات أو نتائج.",
        "5. إذا أعدت صياغة التقرير كاملاً، ابدأ بـ: [تقرير محدّث] ثم",
        "   اكتب النص كاملاً بدون أي مقدمة خارجية.",
        "6. إذا عدّلت قسمًا محدداً، اكتب: [تعديل قسم: الاسم] ثم النص.",
        "7. لا تكتب عبارات مثل «إليك التقرير» أو «بكل سرور». اكتب النص مباشرة.",
        "",
        "الرئيس هو صاحب القرار. أنت المنفّذ الخبير.",
      ].join("\n");
      maxTokens = 2000;
      temperature = 0.5;
    }

    systemPrompt = baseContext + intentInstructions;

    userMessage = messages
      .map((m) => {
        const speaker = m.role === "user" ? "الرئيس" : "أمين السر";
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");
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
      questionsContext,
      "",
      "قواعد الإجابة:",
      "1. ابدأ بفقرة موجزة تلخص الإجابة المباشرة.",
      "2. اشرح بالتفصيل مستندًا إلى محتوى الورقة.",
      "3. إذا لم تكن الإجابة في الورقة، فاكتب «غير مذكور في الورقة» ولا تختلق معلومة.",
      "4. اكتب بأسلوب علمي مباشر بدون رموز أو زخارف.",
      "5. اجعل الإجابة بين ١٠٠ و ٣٠٠ كلمة.",
      "6. إذا كان السؤال مرتبطاً بسؤال آخر طرح سابقاً، اربط بينهما.",
    ].join("\n");

    userMessage = [
      "=== سؤال الجمهور ===",
      questionText || "(لم يُحدد سؤال)",
      "",
      "أجب على هذا السؤال بناءً على محتوى الورقة البحثية.",
    ].join("\n");
    maxTokens = 1000;
    temperature = 0.4;
  }

  // ── Generate via DeepSeek ──
  try {
    const result = await generateCompletion({
      system: systemPrompt,
      user: userMessage,
      maxTokens,
      temperature,
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
