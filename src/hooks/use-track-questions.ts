"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceQuestion } from "@/types";

interface UseTrackQuestionsResult {
  questions: AudienceQuestion[];
  loading: boolean;
  live: boolean;
  newCount: number;
  /** Submit a new question for this track. Returns success boolean. */
  submit: (question: string, author?: string) => Promise<boolean>;
  reload: () => void;
}

/**
 * Per-track audience questions — backed by the local database.
 *
 * - Fetches the current snapshot via GET /api/questions?trackId=N.
 * - Opens an SSE stream at /api/questions/stream?trackId=N for real-time
 *   delivery of new questions for THIS TRACK ONLY.
 * - `submit()` POSTs a new question to /api/questions (saved with trackId).
 *
 * The chair of Track N only sees questions where trackId = N — a question
 * submitted for Track 2 won't appear if the viewer has Track 1 open.
 */
export function useTrackQuestions(
  enabled: boolean,
  trackId: number,
): UseTrackQuestionsResult {
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Reset when trackId changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions([]);
    setNewCount(0);
  }, [trackId]);

  // Initial snapshot (REST) — runs on mount, trackId change, reload, AND
  // when the panel opens (enabled) so the list is fresh every time.
  useEffect(() => {
    const current = ++reqRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    fetch(`/api/questions?trackId=${trackId}`, { cache: "no-store" })
      .then(async (res) => {
        if (current !== reqRef.current) return;
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        setQuestions(data.questions ?? []);
      })
      .catch(() => {
        if (current !== reqRef.current) return;
        setQuestions([]);
      })
      .finally(() => {
        if (current !== reqRef.current) return;
        setLoading(false);
      });
  }, [trackId, nonce, enabled]);

  // Real-time SSE — only when panel is open.
  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLive(false);
      return;
    }

    const es = new EventSource(
      `/api/questions/stream?trackId=${trackId}`,
    );

    es.addEventListener("open", () => setLive(true));

    es.addEventListener("SNAPSHOT", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.questions)) {
          setQuestions(payload.questions);
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener("NEW_QUESTION", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const q = payload.question as AudienceQuestion;
        if (!q || !q.id) return;
        setQuestions((prev) => {
          if (prev.some((x) => x.id === q.id)) return prev;
          return [q, ...prev];
        });
        setNewCount((c) => c + 1);
      } catch {
        // ignore
      }
    });

    es.addEventListener("error", () => {
      setLive(false);
    });

    return () => {
      es.close();
      setLive(false);
    };
  }, [enabled, trackId]);

  // Submit a new question for this track.
  const submit = useCallback(
    async (question: string, author?: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, question, author }),
        });
        if (!res.ok) return false;
        return true;
      } catch {
        return false;
      }
    },
    [trackId],
  );

  return { questions, loading, live, newCount, submit, reload };
}
