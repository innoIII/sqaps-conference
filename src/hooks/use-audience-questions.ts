"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceQuestion } from "@/types";

interface UseAudienceQuestionsResult {
  questions: AudienceQuestion[];
  loading: boolean;
  error: string | null;
  source: "external" | "sample" | null;
  reload: () => void;
}

/**
 * Fetches audience questions from /api/audience-questions.
 *
 * The server route proxies an external API (when configured) and falls back to
 * sample questions. Stale-response guard prevents out-of-order updates, and a
 * manual `reload()` is available for the refresh button.
 */
export function useAudienceQuestions(): UseAudienceQuestionsResult {
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"external" | "sample" | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const current = ++reqRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch("/api/audience-questions", { cache: "no-store" })
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
  }, [nonce]);

  return { questions, loading, error, source, reload };
}
