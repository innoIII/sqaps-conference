import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateCompletion } from "@/lib/ai";
import { getTrackById } from "@/lib/tracks";
import { getContent } from "@/lib/site-content-server";
import { getTrackSession, getSessionReport } from "@/lib/track-session-server";
import {
  loadDossier,
  dossierToText,
  type PaperCard,
  type PaperDossier,
} from "@/lib/paper-knowledge";
import {
  RUBRIC,
  RUBRIC_MAX,
  gradeFor,
  REVIEWER_PERSONA,
  EVALUATION_INSTRUCTIONS,
  CARD_INSTRUCTIONS,
  SESSION_REPORT_TEMPLATE,
  SECRETARY_MINUTES_TEMPLATE,
  DISCUSSION_DIGEST_INSTRUCTIONS,
  FINAL_STATEMENT_TEMPLATE,
  type RubricKey,
} from "@/lib/ai-prompts";
import type { ApiErrorPayload } from "@/types";
import { checkReportAccess } from "@/lib/report-pin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/ai/analyze — the session chair's scientific assistant.
 *
 * Body: { trackId, action, paperSlot?, notes?, refresh? }
 *   Paper actions (need paperSlot):
 *     summary    → structured summary (from the pre-built card when available)
 *     questions  → discussion questions for the chair to ask the researcher
 *     evaluate   → 8-criterion peer review, each /5 (cached in ai_evaluations)
 *   Session actions:
 *     compare          → common themes, agreements/differences, gaps
 *     recommendations  → unified, de-duplicated, categorised recommendations
 *     report           → the official session-chair report
 *     minutes          → the rapporteur's official session minutes (محضر الجلسة)
 *     discussion       → digest of audience questions + rapporteur notes, by paper
 *   Conference action:
 *     final            → draft closing statement from all session reports
 *
 * Response: { reply, suggestedReport?, provider }
 */

type Action =
  | "summary"
  | "questions"
  | "evaluate"
  | "compare"
  | "recommendations"
  | "report"
  | "minutes"
  | "discussion"
  | "final";

const ACTIONS: Action[] = [
  "summary",
  "questions",
  "evaluate",
  "compare",
  "recommendations",
  "report",
  "minutes",
  "discussion",
  "final",
];
const PAPER_ACTIONS: Action[] = ["summary", "questions", "evaluate"];

interface Evaluation {
  scores: Record<RubricKey, { score: number; reason: string }>;
  strengths: string[];
  improvements: string[];
  verdict: string;
  confidence: string;
  total: number;
  grade: string;
  basis: "full" | "abstract";
  at: string;
}

function bad(error: string, status = 400) {
  const body: ApiErrorPayload = { error };
  return NextResponse.json(body, { status });
}

const bullets = (items: string[] | undefined) =>
  (items ?? []).filter(Boolean).map((x) => `- ${x}`).join("\n");

// ── Rendering (no AI call needed) ─────────────────────────────────────────

function renderCardSummary(d: PaperDossier, card: PaperCard): string {
  return [
    `ملخص الورقة ${d.slot}: ${d.title}`,
    d.researchers ? `الباحث: ${d.researchers}` : "",
    card.source === "abstract" ? "ملاحظة: التحليل مبني على صفحة الملخص في كتيب المؤتمر، وسيُحدَّث عند رفع النص الكامل." : "",
    "",
    "أولاً: الملخص",
    card.summary,
    "",
    "ثانياً: الإشكالية والأهداف",
    card.problem,
    bullets(card.objectives),
    "",
    "ثالثاً: المنهج والعينة",
    `${card.methodology}${card.sample ? ` — ${card.sample}` : ""}`,
    "",
    "رابعاً: أبرز النتائج",
    bullets(card.findings) || "غير مذكور في الورقة",
    "",
    "خامساً: التوصيات",
    bullets(card.recommendations) || "غير مذكور في الورقة",
    "",
    "سادساً: نقاط القوة",
    bullets(card.strengths),
    "",
    "سابعاً: جوانب تحتاج إلى استيضاح",
    bullets(card.gaps),
    "",
    "ثامناً: الارتباط بمحور الجلسة",
    card.relevance,
  ]
    .filter((l) => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderQuestions(d: PaperDossier, qs: string[]): string {
  return [
    `أسئلة مقترحة للنقاش — الورقة ${d.slot}: ${d.title}`,
    d.researchers ? `موجهة إلى: ${d.researchers}` : "",
    "",
    ...qs.map((q, i) => `${i + 1}. ${q}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderEvaluation(d: PaperDossier, ev: Evaluation): string {
  const rows = RUBRIC.map((c) => {
    const s = ev.scores[c.key];
    return `| ${c.label} | ${s?.score ?? "—"} / 5 | ${s?.reason ?? ""} |`;
  });
  const lines: (string | false)[] = [
    `التقييم العلمي — الورقة ${d.slot}: ${d.title}`,
    !!d.researchers && `الباحث: ${d.researchers}`,
    ev.basis === "abstract" &&
      "تنبيه: التقييم أولي ومبني على صفحة الملخص فقط، ويُعاد عند رفع النص الكامل للورقة.",
    "",
    "| المعيار | الدرجة | المبرر |",
    "|---|---|---|",
    ...rows,
    `| **المجموع** | **${ev.total} / ${RUBRIC_MAX}** | **التقدير: ${ev.grade}** |`,
    "",
    "نقاط القوة:",
    bullets(ev.strengths),
    "",
    "ملاحظات تطويرية:",
    bullets(ev.improvements),
    "",
    `خلاصة التقييم: ${ev.verdict}`,
    `درجة الثقة في الحكم: ${ev.confidence}`,
    "",
    "هذا التقييم استرشادي يساعد رئيس الجلسة، والقرار النهائي له.",
  ];
  return lines.filter((l): l is string => l !== false).join("\n");
}

// ── AI helpers ─────────────────────────────────────────────────────────────

async function ask(user: string, task: string, maxTokens: number, json = false) {
  return generateCompletion({
    system: `${REVIEWER_PERSONA}\n\n${task}`,
    user,
    maxTokens,
    temperature: json ? 0.2 : 0.4,
    timeoutMs: 100000,
    json,
  });
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

async function cachedEvaluation(trackId: number, slot: number): Promise<Evaluation | null> {
  try {
    const row = await db.aiEvaluation.findUnique({ where: { trackId_slot: { trackId, slot } } });
    return row ? parseJson<Evaluation>(row.data) : null;
  } catch {
    return null;
  }
}

async function evaluate(trackId: number, d: PaperDossier, context: string, refresh: boolean) {
  const basis: Evaluation["basis"] = d.abstractOnly ? "abstract" : "full";
  if (!refresh) {
    const cached = await cachedEvaluation(trackId, d.slot);
    if (cached && cached.basis === basis) return { ev: cached, provider: "cache" };
  }
  const res = await ask(`${context}\n\n${dossierToText(d, "full")}`, EVALUATION_INSTRUCTIONS, 2200, true);
  const parsed = parseJson<Omit<Evaluation, "total" | "grade" | "basis" | "at">>(res.text);
  if (!parsed?.scores) throw new Error("تعذّر قراءة نتيجة التقييم من المفكّر، حاول مرة أخرى.");
  const scores = {} as Evaluation["scores"];
  let total = 0;
  for (const c of RUBRIC) {
    const s = parsed.scores[c.key];
    const score = Math.min(5, Math.max(1, Math.round(Number(s?.score) || 1)));
    scores[c.key] = { score, reason: String(s?.reason ?? "") };
    total += score;
  }
  const ev: Evaluation = {
    scores,
    strengths: parsed.strengths ?? [],
    improvements: parsed.improvements ?? [],
    verdict: String(parsed.verdict ?? ""),
    confidence: basis === "abstract" ? "منخفضة (الملخص فقط)" : String(parsed.confidence ?? "متوسطة"),
    total,
    grade: gradeFor(total),
    basis,
    at: new Date().toISOString(),
  };
  const data = JSON.stringify(ev);
  await db.aiEvaluation
    .upsert({
      where: { trackId_slot: { trackId, slot: d.slot } },
      create: { trackId, slot: d.slot, data },
      update: { data },
    })
    .catch(() => {}); // cache only — the result is still returned
  return { ev, provider: res.provider };
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let trackId = 0;
  let action: Action;
  let paperSlot: number | undefined;
  let notes = "";
  let refresh = false;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    trackId = parseInt(String(body.trackId ?? "0"), 10);
    action = String(body.action ?? "") as Action;
    paperSlot = body.paperSlot ? parseInt(String(body.paperSlot), 10) : undefined;
    notes = String(body.notes ?? "").trim().slice(0, 20000);
    refresh = body.refresh === true;
  } catch {
    return bad("طلب غير صالح");
  }
  if (!ACTIONS.includes(action)) return bad("إجراء غير معروف");
  // The chair's / rapporteur's tools: same PIN as the session's reports.
  if (trackId) {
    const denied = await checkReportAccess(request, trackId);
    if (denied) return denied;
  }

  // ── Conference-wide closing statement ──
  if (action === "final") {
    const [reports, count] = await Promise.all([
      db.sessionReport.findMany({ where: { paperSlot: null, role: "chair" }, orderBy: { trackId: "asc" } }),
      getContent("tracks.count"),
    ]);
    const n = parseInt(count, 10) || 0;
    const blocks: string[] = [];
    for (let t = 1; t <= n; t++) {
      const title = (await getContent(`track.${t}.title`)) || `الجلسة ${t}`;
      const rep = reports.find((r) => r.trackId === t)?.content?.trim();
      blocks.push(`### ${title}\n${rep || "(لم يُكتب تقرير هذه الجلسة بعد)"}`);
    }
    const res = await ask(blocks.join("\n\n"), FINAL_STATEMENT_TEMPLATE, 3500);
    return NextResponse.json({ reply: res.text, suggestedReport: res.text, provider: res.provider });
  }

  const track = getTrackById(trackId);
  if (!track) return bad("المحور غير موجود");

  const { session, papers } = await getTrackSession(trackId);
  const listed = papers.filter((p) => p.title || p.researcher);
  const trackTitle = (await getContent(`track.${trackId}.title`)) || track.title;
  const context = `محور الجلسة: ${trackTitle}`;

  try {
    // ── Single-paper actions ──
    if (PAPER_ACTIONS.includes(action)) {
      const paper = listed.find((p) => p.slot === paperSlot);
      if (!paper) return bad("اختر ورقة من القائمة أولاً");
      const d = await loadDossier(trackId, paper);

      if (action === "summary") {
        if (d.card) return NextResponse.json({ reply: renderCardSummary(d, d.card), provider: "card" });
        const res = await ask(
          `${context}\n\n${dossierToText(d, "full")}`,
          "=== المهمة: ملخص علمي منظّم للورقة ===\nاكتب: أولاً الملخص، ثانياً الإشكالية والأهداف، ثالثاً المنهج، رابعاً أبرز النتائج، خامساً التوصيات.",
          1500,
        );
        return NextResponse.json({ reply: res.text, provider: res.provider });
      }

      if (action === "questions") {
        if (d.card?.discussionQuestions?.length)
          return NextResponse.json({ reply: renderQuestions(d, d.card.discussionQuestions), provider: "card" });
        const res = await ask(
          `${context}\n\n${dossierToText(d, "full")}`,
          "=== المهمة: أسئلة للنقاش ===\nاقترح 5 أسئلة نقاشية عميقة ومحددة يطرحها رئيس الجلسة على الباحث، مرقّمة، كل سؤال في سطر، ومبنية على مضمون الورقة.",
          900,
        );
        return NextResponse.json({ reply: res.text, provider: res.provider });
      }

      const { ev, provider } = await evaluate(trackId, d, context, refresh);
      return NextResponse.json({ reply: renderEvaluation(d, ev), provider });
    }

    // ── Session-level actions ──
    if (listed.length === 0) return bad("لا توجد أوراق مسجّلة لهذه الجلسة بعد");
    const dossiers = await Promise.all(listed.map((p) => loadDossier(trackId, p)));
    const papersText = dossiers.map((d) => dossierToText(d, "card")).join("\n\n────────\n\n");

    if (action === "compare") {
      const res = await ask(
        `${context}\n\n${papersText}`,
        [
          "=== المهمة: قراءة تحليلية مقارنة لأوراق الجلسة ===",
          "أولاً: القضايا والمحاور المشتركة بين الأوراق.",
          "ثانياً: نقاط الاتفاق.",
          "ثالثاً: نقاط الاختلاف أو تباين المقاربات والمناهج.",
          "رابعاً: الفجوات التي لم تغطها أي ورقة وتستحق بحثاً لاحقاً.",
          "خامساً: كيف تتكامل الأوراق في خدمة محور الجلسة.",
          "اذكر رقم الورقة عند الإشارة إليها.",
        ].join("\n"),
        2200,
      );
      return NextResponse.json({ reply: res.text, provider: res.provider });
    }

    if (action === "recommendations") {
      const res = await ask(
        `${context}\n\n${papersText}`,
        [
          "=== المهمة: توصيات الجلسة الموحّدة ===",
          "اجمع توصيات الأوراق وادمج المتشابه منها في صياغة واحدة، دون تكرار، مرقّمة ومصنّفة:",
          "أولاً: توصيات تشريعية — ثانياً: أمنية وتنفيذية — ثالثاً: تقنية — رابعاً: توعوية ومجتمعية — خامساً: بحثية.",
          "اكتب كل توصية بصيغة إجرائية تبدأ بفعل (تعزيز، تطوير، إنشاء…)، واذكر بين قوسين أرقام الأوراق التي وردت فيها.",
          "احذف أي تصنيف لا توجد له توصيات.",
        ].join("\n"),
        1800,
      );
      return NextResponse.json({ reply: res.text, suggestedReport: undefined, provider: res.provider });
    }

    const audience: string[] = [];
    try {
      const dbQs = await db.question.findMany({ where: { trackId }, orderBy: { createdAt: "asc" }, take: 40 });
      audience.push(...dbQs.map((q) => `${q.paperSlot ? `[ورقة ${q.paperSlot}] ` : ""}${q.question}`));
    } catch {}

    const sessionInfo = [
      `عنوان الجلسة: ${trackTitle}`,
      `الموعد: ${session.time || "غير محدد"}`,
      `المكان: ${session.venue || "غير محدد"}`,
      `رئيس الجلسة: ${session.chair || "غير محدد"}`,
      `مقرر الجلسة: ${session.secretary || "غير محدد"}`,
      `عدد الأوراق: ${dossiers.length}`,
    ].join("\n");

    const audienceText = audience.length
      ? audience.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(لا توجد أسئلة مسجّلة)";

    // ── Rapporteur (مقرر الجلسة) tools ──
    if (action === "discussion") {
      const titles = dossiers.map(
        (d) => `الورقة ${d.slot}: ${d.title}${d.researchers ? ` — ${d.researchers}` : ""}`,
      );
      const res = await ask(
        [
          context,
          "",
          "=== أوراق الجلسة ===",
          titles.join("\n"),
          "",
          "=== ملاحظات مقرر الجلسة ===",
          notes || "(لا توجد ملاحظات مكتوبة بعد)",
          "",
          "=== أسئلة الحضور ===",
          audienceText,
        ].join("\n"),
        DISCUSSION_DIGEST_INSTRUCTIONS,
        1800,
      );
      return NextResponse.json({ reply: res.text, provider: res.provider });
    }

    if (action === "minutes") {
      const chairReport = (await getSessionReport(trackId, null, "chair"))?.content?.trim();
      const user = [
        "=== بيانات الجلسة ===",
        sessionInfo,
        "",
        "=== الأوراق ===",
        papersText,
        "",
        "=== ملاحظات مقرر الجلسة ===",
        notes || "(لا توجد ملاحظات مكتوبة بعد)",
        "",
        "=== التقرير العام لرئيس الجلسة (للاستئناس) ===",
        chairReport || "(لم يُكتب بعد)",
        "",
        "=== أسئلة الحضور ===",
        audienceText,
      ].join("\n");
      const res = await ask(user, SECRETARY_MINUTES_TEMPLATE, 4000);
      return NextResponse.json({
        reply:
          "أعددت محضر الجلسة بالصيغة الرسمية. راجع المعاينة ثم اضغط «تطبيق على التقرير» لنقله إلى المحرر.",
        suggestedReport: res.text,
        provider: res.provider,
      });
    }

    // action === "report"
    const evals = await Promise.all(dossiers.map((d) => cachedEvaluation(trackId, d.slot)));
    const evalLines = dossiers.map((d, i) => {
      const ev = evals[i];
      return ev
        ? `الورقة ${d.slot}: ${ev.total}/${RUBRIC_MAX} — ${ev.grade}${ev.basis === "abstract" ? " (تقييم أولي من الملخص)" : ""} — ${ev.verdict}`
        : `الورقة ${d.slot}: لم يُجرَ التقييم بعد`;
    });

    const user = [
      "=== بيانات الجلسة ===",
      sessionInfo,
      "",
      "=== الأوراق ===",
      papersText,
      "",
      "=== نتائج التقييم المتوفرة ===",
      evalLines.join("\n"),
      "",
      "=== ملاحظات رئيس الجلسة ===",
      notes || "(لا توجد ملاحظات مكتوبة بعد)",
      "",
      "=== أسئلة الحضور ===",
      audienceText,
    ].join("\n");

    const res = await ask(user, SESSION_REPORT_TEMPLATE, 4000);
    return NextResponse.json({
      reply:
        "أعددت تقرير الجلسة بالصيغة الرسمية. راجع المعاينة ثم اضغط «تطبيق على التقرير» لنقله إلى المحرر.",
      suggestedReport: res.text,
      provider: res.provider,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "تعذّر تنفيذ الطلب", 500);
  }
}
