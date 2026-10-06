import type { AudienceQuestion } from "@/types";

/**
 * Shared audience-questions data layer.
 *
 * Both the REST route (/api/audience-questions) and the SSE stream
 * (/api/questions/stream) use this module so the data source + normalization
 * logic lives in exactly one place.
 */

/**
 * Sample audience questions used as a fallback when no external API is
 * configured (or when the external fetch fails). Keeps the UI functional
 * out-of-the-box for demos; organizers wire the real endpoint via env.
 */
export const SAMPLE_QUESTIONS: AudienceQuestion[] = [
  {
    id: "s1",
    question:
      "ما دور التشريعات الوطنية في مواكبة الجرائم الإلكترونية العابرة للحدود، وهل تكفي الاتفاقيات الدولية الحالية؟",
    author: "د. خالد العمري",
    trackId: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "s2",
    question:
      "كيف يمكن تعزيز التعاون الأمني بين أجهزة إنفاذ القانون على المستوى الخليجي لمواجهة الجرائم المنظمة؟",
    author: "أ. منى البلوشي",
    trackId: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "s3",
    question:
      "ما أبرز التحديات التي تواجه جمع الأدلة الرقمية في الجرائم العابرة للحدود؟",
    author: "م. سعيد الكندي",
    trackId: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "s4",
    question:
      "كيف يسهم الذكاء الاصطناعي في الكشف المبكر عن شبكات الجريمة المنظمة عبر الحدود؟",
    author: "د. ريمة الفارس",
    trackId: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "s5",
    question:
      "ما دور الإعلام في تعزيز الوعي المجتمعي بمخاطر الاتجار بالبشر والجرائم المشابهة؟",
    author: "أ. هلال المنذري",
    trackId: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
  },
  {
    id: "s6",
    question:
      "هل هناك آلية موحدة لتسليم المتهمين وتنفيذ الأحكام بين الدول العربية؟",
    author: "زائر دولي",
    trackId: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "s7",
    question:
      "كيف تحمي الحوكمة المؤسسية الرشيدة من اختراق الجرائم المالية العابرة للحدود؟",
    author: "د. عبدالله الحضرمي",
    trackId: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
];

/**
 * Normalize an arbitrary external API response into AudienceQuestion[].
 *
 * Tries common envelope shapes ({ questions | data | items | [...] }) and
 * common field names so organizers don't have to transform their API.
 */
export function normalizeQuestions(raw: unknown): AudienceQuestion[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : // @ts-expect-error — intentionally loose for arbitrary external JSON
      raw?.questions ?? raw?.data ?? raw?.items ?? raw?.results ?? [];

  if (!Array.isArray(arr)) return [];

  return arr
    .map((item, i): AudienceQuestion => {
      // @ts-expect-error — loose access to unknown external objects
      const q = item as Record<string, unknown>;
      const question = String(
        q.question ?? q.text ?? q.title ?? q.content ?? q.body ?? q.message ?? "",
      ).trim();
      const authorRaw = q.author ?? q.name ?? q.user ?? q.askedBy ?? q.userName;
      const author =
        typeof authorRaw === "string"
          ? authorRaw
          : // @ts-expect-error — author might be an object { name }
            (authorRaw as { name?: string })?.name ?? undefined;
      const trackIdRaw = q.trackId ?? q.track ?? q.themeId;
      const trackId =
        typeof trackIdRaw === "number"
          ? trackIdRaw
          : typeof trackIdRaw === "string" && /^\d+$/.test(trackIdRaw)
            ? Number(trackIdRaw)
            : undefined;
      const createdAt = String(
        q.createdAt ?? q.created_at ?? q.date ?? q.timestamp ?? q.time ?? "",
      ).trim();

      return {
        id: String(q.id ?? q._id ?? q.uuid ?? i + 1),
        question,
        author: author || undefined,
        trackId: trackId && trackId >= 1 && trackId <= 5 ? trackId : undefined,
        createdAt: createdAt || undefined,
      };
    })
    .filter((q) => q.question.length > 0);
}

/**
 * Fetch the current audience questions from the configured external API, or
 * fall back to sample questions. Returns { questions, source }.
 */
export async function fetchAudienceQuestions(): Promise<{
  questions: AudienceQuestion[];
  source: "external" | "sample";
}> {
  const url = process.env.AUDIENCE_QUESTIONS_API_URL;

  if (url) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      const key = process.env.AUDIENCE_QUESTIONS_API_KEY;
      if (key) headers.Authorization = `Bearer ${key}`;

      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const questions = normalizeQuestions(data);
        if (questions.length > 0) {
          return { questions, source: "external" };
        }
      }
    } catch {
      // network / parse error → fall through to sample
    }
  }

  return { questions: SAMPLE_QUESTIONS, source: "sample" }
}
