"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceQuestion } from "@/types";

interface UseAudienceQuestionsResult {
  questions: AudienceQuestion[];
  loading: boolean;
  error: string | null;
  source: "external" | "sample" | null;
  /** True while the real-time SSE stream is connected. */
  live: boolean;
  /** Count of questions received in real time (since mount). */
  newCount: number;
  reload: () => void;
}

/**
 * Fetches audience questions for a specific track session from
 * /api/audience-questions?sessionId=<sessionId> (initial snapshot) and then
 * opens a Server-Sent Events stream at /api/questions/stream?sessionId=<...>
 * to receive new questions in real time.
 *
 * Each track passes its own sessionId so only that track's questions show.
 */
export function useAudienceQuestions(
  enabled: boolean = true,
  sessionId: string = "conference-2026",
): UseAudienceQuestionsResult {
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"external" | "sample" | null>(null);
  const [live, setLive] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Reset state when sessionId changes (switching tracks).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions([]);
    setNewCount(0);
  }, [sessionId]);

  // Initial snapshot (REST) — runs on mount + sessionId change + reload().
  useEffect(() => {
    const current = ++reqRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch(`/api/audience-questions?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (current !== reqRef.current) return;
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setSource(data.source ?? null);
      })
      .catch(() => {
        if (current !== reqRef.current) return;
        setError("تعذر تحميل أسئلة الجمهور. حاول مرة أخرى.");
        setQuestions([]);
        setSource(null);
      })
      .finally(() => {
        if (current !== reqRef.current) return;
        setLoading(false);
      });
  }, [sessionId, nonce]);

  // Real-time SSE stream — only active when `enabled` (panel is open).
  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLive(false);
      return;
    }

    const es = new EventSource(
      `/api/questions/stream?sessionId=${encodeURIComponent(sessionId)}`,
    );

    es.addEventListener("open", () => setLive(true));

    es.addEventListener("SNAPSHOT", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.questions)) {
          setQuestions(payload.questions);
        }
      } catch {
        // ignore malformed payload
      }
    });

    es.addEventListener("NEW_QUESTION", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const q = payload.question as AudienceQuestion;
        if (!q || !q.id) return;
        setQuestions((prev) => {
          if (prev.some((x) => x.id === q.id)) return prev;
          // New questions go to the top.
          return [q, ...prev];
        });
        setNewCount((c) => c + 1);
      } catch {
        // ignore malformed payload
      }
    });

    // Real-time status updates (e.g. a question gets answered).
    es.addEventListener("QUESTION_ANSWERED", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const updated = (payload.payload?.question ??
          payload.question ??
          payload) as AudienceQuestion;
        if (!updated?.id) return;
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === updated.id
              ? {
                  ...q,
                  status: "ANSWERED",
                  lecturerNotes: updated.lecturerNotes ?? q.lecturerNotes,
                  upvotes: updated.upvotes ?? q.upvotes,
                }
              : q,
          ),
        );
      } catch {
        // ignore malformed payload
      }
    });

    es.addEventListener("error", () => {
      setLive(false);
      // EventSource auto-reconnects; nothing to do here.
    });

    return () => {
      es.close();
      setLive(false);
    };
  }, [enabled, sessionId]);

  return {
    questions,
    loading,
    error,
    source,
    live,
    newCount,
    reload,
  };
}
