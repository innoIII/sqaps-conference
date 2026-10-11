/**
 * Centralized AI provider layer — DeepSeek only.
 *
 * Requires: DEEPSEEK_API_KEY (sk-...)
 * Optional: DEEPSEEK_MODEL (default: deepseek-chat)
 *
 * Get your API key at: https://platform.deepseek.com/api_keys
 *
 * If DeepSeek fails, falls back to a local response (no AI).
 */

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionResult {
  text: string;
  provider: "deepseek" | "local-fallback";
  model: string;
  durationMs: number;
  errors?: string[];
}

export interface AiCompletionOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AiProviderStatus {
  deepseek: {
    configured: boolean;
    model: string;
  };
}

/** Get the configured DeepSeek model (env override → default). */
export function getDeepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

/** Check which providers are available (does NOT make a network call). */
export function getProviderStatus(): AiProviderStatus {
  return {
    deepseek: {
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      model: getDeepSeekModel(),
    },
  };
}

// ── Runtime health (for the admin panel) ──
let lastGoodProvider: string | null = null;
const failureCounts: Record<string, number> = {};

export function getRuntimeHealth(): {
  lastGoodProvider: string | null;
  failureCounts: Record<string, number>;
  circuitBreakersOpen: string[];
} {
  const circuitBreakersOpen = Object.entries(failureCounts)
    .filter(([, count]) => count >= 5)
    .map(([name]) => name);
  return {
    lastGoodProvider,
    failureCounts: { ...failureCounts },
    circuitBreakersOpen,
  };
}

export function resetAiCircuits(): void {
  for (const key of Object.keys(failureCounts)) {
    failureCounts[key] = 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI request timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Call DeepSeek via its OpenAI-compatible API.
 * API docs: https://api-docs.deepseek.com/
 */
async function callDeepSeek(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const model = getDeepSeekModel();
  const start = Date.now();
  const res = await withTimeout(
    fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.5,
      }),
    }),
    opts.timeoutMs ?? 45000,
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek returned ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("DeepSeek returned empty response");
  }

  return {
    text,
    provider: "deepseek",
    model,
    durationMs: Date.now() - start,
  };
}

/**
 * Generate an AI completion via DeepSeek.
 * Falls back to a local response if DeepSeek fails.
 */
export async function generateCompletion(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const errors: string[] = [];

  // Try DeepSeek (with 1 retry).
  if (process.env.DEEPSEEK_API_KEY) {
    for (let attempt = 0; attempt <= 1; attempt++) {
      if ((failureCounts["deepseek"] || 0) >= 5) {
        errors.push("deepseek: circuit breaker open (5+ failures)");
        break;
      }
      try {
        const result = await callDeepSeek(opts);
        failureCounts["deepseek"] = 0;
        lastGoodProvider = "deepseek";
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const is4xx = /returned 4\d\d/.test(msg) || /401|403/.test(msg);
        errors.push(`deepseek: ${msg}`);
        if (is4xx) break; // Don't retry on auth errors.
        if (attempt === 0) await sleep(500); // Retry backoff.
      }
    }
  } else {
    errors.push("deepseek: DEEPSEEK_API_KEY not configured");
  }

  // ── Local fallback (no AI) ──
  const fallbackText = generateLocalFallback(opts);
  return {
    text: fallbackText,
    provider: "local-fallback",
    model: "none",
    durationMs: 0,
    errors,
  };
}

/**
 * Generate a minimal local response when DeepSeek is down.
 */
function generateLocalFallback(opts: AiCompletionOptions): string {
  const timestamp = new Date().toLocaleString("ar", {
    timeZone: "Asia/Muscat",
  });

  const isReport =
    opts.system.includes("تقرير") || opts.system.includes("رئيس الجلسة");
  const isAnswer =
    opts.system.includes("إجابة") || opts.system.includes("الجمهور");

  if (isReport) {
    return [
      "## تقرير الجلسة (نسخة احتياطية)",
      "",
      "> ملاحظة: تعذر الاتصال بالمساعد الذكي. هذا تقرير مبسط كنسخة احتياطية.",
      `> الوقت: ${timestamp}`,
      "",
      "### مقدمة",
      "عقدت الجلسة ضمن المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود.",
      "",
      "### الأوراق البحثية",
      "(أضف تفاصيل الأوراق البحثية يدوياً هنا)",
      "",
      "### النقاشات",
      "(أضف ملاحظاتك حول النقاشات هنا)",
      "",
      "### التوصيات",
      "- توصية 1",
      "- توصية 2",
      "",
      "---",
      "⚠️ تم توليد هذا التقرير كنسخة احتياطية لأن المساعد الذكي غير متاح.",
    ].join("\n");
  }

  if (isAnswer) {
    return [
      "تعذر الاتصال بالمساعد الذكي للحصول على إجابة آلية في هذا الوقت.",
      "",
      "يرجى الرد على سؤال الجمهور بناءً على معرفتك بمحتوى الورقة البحثية.",
      "",
      `(وقت المحاولة: ${timestamp})`,
    ].join("\n");
  }

  return `تعذر الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى لاحقاً.\n\n(وقت المحاولة: ${timestamp})`;
}
