import type { AudienceQuestion } from "@/types";

/**
 * In-memory fallback store for questions when the DB is unavailable
 * (local dev without postgres). Questions persist for the lifetime of the
 * server process — enough for local testing. On Vercel, the real Postgres
 * DB is used instead.
 *
 * NOTE: This is NOT shared across serverless instances — it's a local-dev
 * convenience only. Production uses Prisma Postgres.
 */

interface StoredQuestion extends AudienceQuestion {
  trackId: number;
}

const memoryStore: StoredQuestion[] = [];

/** Save a question to the in-memory store. */
export function memoryCreateQuestion(
  trackId: number,
  question: string,
  author?: string,
  paperSlot?: number,
): StoredQuestion {
  const q: StoredQuestion = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    trackId,
    question,
    author,
    paperSlot: paperSlot && paperSlot > 0 ? paperSlot : undefined,
    status: "NEW",
    createdAt: new Date().toISOString(),
  };
  memoryStore.unshift(q);
  // Keep max 500 to avoid memory bloat.
  if (memoryStore.length > 500) memoryStore.length = 500;
  return q;
}

/** Get questions for a track from the in-memory store. */
export function memoryGetQuestions(trackId: number): StoredQuestion[] {
  return memoryStore
    .filter((q) => q.trackId === trackId)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** Get questions for a track created after the given ISO timestamp. */
export function memoryGetNewQuestions(
  trackId: number,
  afterIso: string,
): StoredQuestion[] {
  return memoryGetQuestions(trackId).filter(
    (q) => (q.createdAt ?? "") > afterIso,
  );
}

/** Delete a single question by id from the in-memory store. */
export function memoryDeleteQuestion(id: string): boolean {
  const idx = memoryStore.findIndex((q) => q.id === id);
  if (idx === -1) return false;
  memoryStore.splice(idx, 1);
  return true;
}

/** Delete all questions for a track from the in-memory store. */
export function memoryDeleteAllForTrack(trackId: number): number {
  const before = memoryStore.length;
  for (let i = memoryStore.length - 1; i >= 0; i--) {
    if (memoryStore[i].trackId === trackId) memoryStore.splice(i, 1);
  }
  return before - memoryStore.length;
}

/** Delete ALL questions from the in-memory store. */
export function memoryDeleteAll(): number {
  const count = memoryStore.length;
  memoryStore.length = 0;
  return count;
}
