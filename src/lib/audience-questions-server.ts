import type { AudienceQuestion } from "@/types";

/**
 * Shared audience-questions data layer.
 *
 * Both the REST route (/api/audience-questions) and the SSE stream
 * (/api/questions/stream) use this module so the data source + normalization
 * logic lives in exactly one place.
 */

/**
 * Fallback audience questions used when no external API is configured.
 *
 * Left empty intentionally — the portal is wired to the live external Q&A
 * system via AUDIENCE_QUESTIONS_API_URL. When that env var is set, questions
 * come from the real source. If it isn't set, the UI shows an empty state
 * (no fake/demo data).
 */
export const SAMPLE_QUESTIONS: AudienceQuestion[] = [];

/**
 * Normalize an arbitrary external API response into AudienceQuestion[].
 *
 * Tries common envelope shapes ({ questions | data | items | [...] }) and
 * common field names so organizers don't have to transform their API.
 * Handles the sqps-qnn.vercel.app shape: { success, questions, stats } with
 * questions carrying { id, question, status, upvotes, lecturerNotes, ... }.
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
      const statusRaw = String(q.status ?? "").toUpperCase();
      const status: AudienceQuestion["status"] =
        statusRaw === "ANSWERED"
          ? "ANSWERED"
          : statusRaw === "ARCHIVED"
            ? "ARCHIVED"
            : "NEW";
      const upvotesRaw = q.upvotes ?? q.votes ?? q.upvoteCount;
      const upvotes =
        typeof upvotesRaw === "number"
          ? upvotesRaw
          : typeof upvotesRaw === "string" && /^\d+$/.test(upvotesRaw)
            ? Number(upvotesRaw)
            : undefined;
      const lecturerNotes = String(q.lecturerNotes ?? q.notes ?? q.answer ?? "").trim();

      return {
        id: String(q.id ?? q._id ?? q.uuid ?? i + 1),
        question,
        author: author || undefined,
        trackId: trackId && trackId >= 1 && trackId <= 5 ? trackId : undefined,
        createdAt: createdAt || undefined,
        status,
        upvotes,
        lecturerNotes: lecturerNotes || undefined,
      };
    })
    .filter((q) => q.question.length > 0);
}

/** The configured session id (defaults to "lecture-101" for the Q&A system). */
export function getSessionId(): string {
  return process.env.AUDIENCE_QUESTIONS_SESSION_ID ?? "lecture-101";
}

/** The configured external questions API base URL. */
export function getExternalApiUrl(): string | null {
  return process.env.AUDIENCE_QUESTIONS_API_URL ?? null;
}

/**
 * Fetch the current audience questions from the configured external API, or
 * fall back to sample questions. Returns { questions, source }.
 *
 * @param sessionIdOverride — optional session id from the request query
 *   (each track passes its own sessionId so only that track's questions show).
 */
export async function fetchAudienceQuestions(
  sessionIdOverride?: string,
): Promise<{
  questions: AudienceQuestion[];
  source: "external" | "sample";
}> {
  const baseUrl = getExternalApiUrl();
  const sessionId = sessionIdOverride ?? getSessionId();

  if (baseUrl) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      const key = process.env.AUDIENCE_QUESTIONS_API_KEY;
      if (key) headers.Authorization = `Bearer ${key}`;

      // Append sessionId as a query param (the Q&A system filters by session).
      const url = new URL(baseUrl);
      url.searchParams.set("sessionId", sessionId);

      const res = await fetch(url.toString(), { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const questions = normalizeQuestions(data);
        // External is the source even if the session currently has 0 questions.
        return { questions, source: "external" };
      }
    } catch {
      // network / parse error → fall through to sample
    }
  }

  return { questions: SAMPLE_QUESTIONS, source: "sample" };
}
