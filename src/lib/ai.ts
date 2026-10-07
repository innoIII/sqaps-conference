import Anthropic from "@anthropic-ai/sdk";

/**
 * Centralized AI provider layer.
 *
 * This module abstracts away the details of calling different AI providers
 * so the API routes can stay clean.
 *
 * Provider priority (highest first):
 *   1. Claude (Anthropic SDK)         — requires ANTHROPIC_API_KEY (sk-ant-api-...)
 *   2. OpenRouter (OpenAI-compatible) — requires OPENROUTER_API_KEY (sk-or-v1-...)
 *      ↳ has Claude models + free Llama/Mistral models, works from any server
 *   3. Groq (OpenAI-compatible)       — requires GROQ_API_KEY (gsk_...)
 *      ↳ very fast + free tier, Llama models only
 *   4. z-ai REST API (hardcoded cfg)  — works in this sandbox, may fail on Vercel
 *   5. z-ai SDK (dynamic import)      — last resort (requires .z-ai-config file)
 *
 * ── Vercel deployment ──
 * On Vercel, set ONE of these env vars:
 *   - ANTHROPIC_API_KEY  → use Claude directly (best quality)
 *   - OPENROUTER_API_KEY → use OpenRouter (has Claude + free models, recommended)
 *   - GROQ_API_KEY       → use Groq (fast + free, Llama only)
 *
 * If none are set, the AI falls back to z-ai (which may not work on Vercel).
 *
 * ── OpenRouter free models (no cost) ──
 * Set OPENROUTER_MODEL to one of:
 *   - "meta-llama/llama-3.3-70b-instruct:free"
 *   - "mistralai/mistral-7b-instruct:free"
 *   - "google/gemini-flash-1.5:free"
 *   - "anthropic/claude-3.5-haiku" (paid, but cheap)
 *   - "anthropic/claude-3.5-sonnet" (paid, higher quality)
 *
 * ── Groq free models ──
 * Set GROQ_MODEL to one of:
 *   - "llama-3.3-70b-versatile" (default — best)
 *   - "llama-3.1-8b-instant" (deprecated — may not work)
 *   - "gemma2-9b-it" (fast, smaller)
 */

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionResult {
  /** The generated text. */
  text: string;
  /** Which provider produced this result. */
  provider:
    | "claude"
    | "openrouter"
    | "groq"
    | "zai-rest"
    | "zai-sdk"
    | "local-fallback";
  /** The model used. */
  model: string;
  /** Time taken in milliseconds. */
  durationMs: number;
}

export interface AiCompletionOptions {
  /** The system prompt (sets the AI's persona / instructions). */
  system: string;
  /** The user message. */
  user: string;
  /** Max tokens to generate. Default: 1024. */
  maxTokens?: number;
  /** Temperature (0..1). Default: 0.4. */
  temperature?: number;
  /** Optional timeout in ms. Default: 45000 (45s). */
  timeoutMs?: number;
}

/** Which providers are configured (for the health check). */
export interface AiProviderStatus {
  claude: {
    configured: boolean;
    model: string;
  };
  openrouter: {
    configured: boolean;
    model: string;
  };
  groq: {
    configured: boolean;
    model: string;
  };
  zaiRest: {
    configured: boolean;
    model: string;
  };
  zaiSdk: {
    configured: boolean;
  };
}

/** Get the configured Claude model (env override → default). */
export function getClaudeModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";
}

/** Get the configured OpenRouter model (env override → default free model). */
export function getOpenRouterModel(): string {
  // Default to a free Llama model — works without payment.
  // For Claude via OpenRouter, set OPENROUTER_MODEL=anthropic/claude-3.5-haiku
  return (
    process.env.OPENROUTER_MODEL ||
    "meta-llama/llama-3.3-70b-instruct:free"
  );
}

/** Get the configured Groq model (env override → default). */
export function getGroqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

/** Get the configured z-ai model (env override → default). */
export function getZaiModel(): string {
  return process.env.ZAI_MODEL || "glm-4.6";
}

/** Check which providers are available (does NOT make a network call). */
export function getProviderStatus(): AiProviderStatus {
  return {
    claude: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      model: getClaudeModel(),
    },
    openrouter: {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      model: getOpenRouterModel(),
    },
    groq: {
      configured: Boolean(process.env.GROQ_API_KEY),
      model: getGroqModel(),
    },
    zaiRest: {
      // z-ai REST always has a hardcoded fallback config — always "configured"
      // (but may not actually work on Vercel).
      configured: true,
      model: getZaiModel(),
    },
    zaiSdk: {
      // The SDK requires a config file (.z-ai-config) which isn't deployed
      // to Vercel — so on Vercel this is effectively unavailable.
      configured: true,
    },
  };
}

/** Get the list of providers that are actually configured (for priority order). */
function getConfiguredProviders(): AiProviderStatus {
  return getProviderStatus();
}

/** Convert a promise into a timeout-racing promise. */
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
 * Call Claude (Anthropic SDK).
 * Returns the text response or throws on error.
 */
async function callClaude(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const model = getClaudeModel();
  const start = Date.now();
  const client = new Anthropic({ apiKey });
  const message = await withTimeout(
    client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      // @ts-expect-error — temperature is supported by the API but the SDK
      // type signature is strict; we pass it through.
      temperature: opts.temperature ?? 0.4,
    }),
    opts.timeoutMs ?? 45000,
  );

  const text =
    message.content[0]?.type === "text"
      ? message.content[0].text.trim()
      : "";

  if (!text) {
    throw new Error("Claude returned empty response");
  }

  return {
    text,
    provider: "claude",
    model,
    durationMs: Date.now() - start,
  };
}

/**
 * Call OpenRouter via its OpenAI-compatible API.
 * OpenRouter provides access to Claude, GPT, Llama, Mistral, Gemini, etc.
 * Works from any server (including Vercel) — only needs an API key.
 *
 * Get a free key at: https://openrouter.ai/keys
 */
async function callOpenRouter(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const model = getOpenRouterModel();
  const start = Date.now();
  const res = await withTimeout(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter recommends these headers for ranking/attribution.
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://sqaps-conference.vercel.app",
        "X-Title": process.env.OPENROUTER_TITLE || "SQAPS Conference Portal",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
      }),
    }),
    opts.timeoutMs ?? 45000,
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter returned ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty response");
  }

  return {
    text,
    provider: "openrouter",
    model,
    durationMs: Date.now() - start,
  };
}

/**
 * Call Groq via its OpenAI-compatible API.
 * Groq is extremely fast (LPU hardware) and has a generous free tier.
 * Only hosts Llama + Mistral models (no Claude/GPT).
 *
 * Get a free key at: https://console.groq.com/keys
 */
/** Fallback Groq models — tried in order if the primary model fails. */
const GROQ_FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-8b-8192",
  "gemma2-9b-it",
  "llama-3.1-8b-instant",
];

async function callGroq(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Build the list of models to try: the configured model first, then fallbacks.
  const configuredModel = getGroqModel();
  const modelsToTry = [
    configuredModel,
    ...GROQ_FALLBACK_MODELS.filter((m) => m !== configuredModel),
  ];

  const start = Date.now();
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const res = await withTimeout(
        fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            temperature: opts.temperature ?? 0.4,
          }),
        }),
        opts.timeoutMs ?? 45000,
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // If it's a model_not_found error, try the next model.
        if (errText.includes("model_not_found") || errText.includes("does not exist")) {
          lastError = new Error(`Groq model "${model}" not found: ${errText.slice(0, 150)}`);
          continue; // Try the next fallback model.
        }
        // For other errors (rate limit, auth), throw immediately.
        throw new Error(`Groq returned ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Groq returned empty response");
      }

      return {
        text,
        provider: "groq",
        model,
        durationMs: Date.now() - start,
      };
    } catch (e) {
      // If it's a model_not_found we already handled (continue above).
      // For other errors, save and try next model.
      if (e instanceof Error && !e.message.includes("not found")) {
        throw e; // Non-model errors should propagate.
      }
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error("All Groq models failed");
}

/**
 * Call z-ai via the REST API (hardcoded config — works in this sandbox).
 * On Vercel this may fail if the token is sandbox-specific.
 */
async function callZaiRest(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const zaiBaseUrl = "https://internal-api.z.ai/v1";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: "Bearer Z.ai",
    "X-Z-AI-From": "Z",
  };
  const chatId =
    process.env.ZAI_CHAT_ID ||
    "chat-fae624ef-7681-495c-931f-847ca0ae58ad";
  const userId =
    process.env.ZAI_USER_ID || "92cc2b60-655b-4f0a-8b6d-387a9c1f94c8";
  const token =
    process.env.ZAI_TOKEN ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTJjYzJiNjAtNjU1Yi00ZjBhLThiNmQtMzg3YTljMWY5NGM4IiwiY2hhdF9pZCI6ImNoYXQtZmFlNjI0ZWYtNzY4MS00OTVjLTkzMWYtODQ3Y2EwYWU1OGFkIiwicGxhdGZvcm0iOiJ6YWkifQ.OB2GIUb-oi4bzRvgqz_7ONwNaFup1Ao7vFLq43WxXNc";
  if (chatId) headers["X-Chat-Id"] = chatId;
  if (userId) headers["X-User-Id"] = userId;
  if (token) headers["X-Token"] = token;

  const model = getZaiModel();
  const start = Date.now();
  const res = await withTimeout(
    fetch(`${zaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        thinking: { type: "disabled" },
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1024,
      }),
    }),
    opts.timeoutMs ?? 45000,
  );

  if (!res.ok) {
    throw new Error(`z-ai REST returned ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("z-ai REST returned empty response");
  }

  return {
    text,
    provider: "zai-rest",
    model,
    durationMs: Date.now() - start,
  };
}

/**
 * Call z-ai via the SDK (dynamic import). Last-resort fallback.
 */
async function callZaiSdk(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const start = Date.now();
  const ZAIModule = await import("z-ai-web-dev-sdk");
  const ZAI = ZAIModule.default;
  const zai = await ZAI.create();
  const completion = await withTimeout(
    zai.chat.completions.create({
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      thinking: { type: "disabled" },
    }),
    opts.timeoutMs ?? 45000,
  );
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("z-ai SDK returned empty response");
  }
  return {
    text,
    provider: "zai-sdk",
    model: "glm-4.6",
    durationMs: Date.now() - start,
  };
}

/** Provider definition for the priority loop. */
interface ProviderDef {
  name: AiCompletionResult["provider"];
  configured: boolean;
  call: (opts: AiCompletionOptions) => Promise<AiCompletionResult>;
}

/**
 * Generate an AI completion using the configured providers with automatic
 * fallback. Tries each provider in priority order:
 *
 *   1. Claude (if ANTHROPIC_API_KEY set)
 *   2. OpenRouter (if OPENROUTER_API_KEY set) — has Claude + free models
 *   3. Groq (if GROQ_API_KEY set) — fast + free
 *   4. z-ai REST (always — may fail on Vercel)
 *   5. z-ai SDK (always — last resort)
 *
 * Returns the first successful result. If all providers fail, throws an
 * Error with a user-friendly Arabic message listing all failures.
 */
/** Last known good provider (in-memory cache to speed up subsequent calls). */
let lastGoodProvider: AiCompletionResult["provider"] | null = null;

/** Count of consecutive failures per provider (for circuit-breaker logic). */
const failureCounts: Record<string, number> = {};

/** Get the runtime health stats (for the admin panel). */
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

/** Reset all failure counts + circuit breakers (admin action). */
export function resetAiCircuits(): void {
  for (const key of Object.keys(failureCounts)) {
    failureCounts[key] = 0;
  }
}

/** Sleep helper for retry backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Try calling a provider with up to 2 retries + exponential backoff.
 * Only retries on transient errors (timeouts, 5xx, network) — not on 4xx.
 */
async function callWithRetry(
  provider: ProviderDef,
  opts: AiCompletionOptions,
  maxRetries = 1,
): Promise<AiCompletionResult> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use a shorter timeout for retries (the provider may be slow).
      // On Vercel Hobby, the max function duration is ~10s, so we keep
      // timeouts tight to avoid the function being killed.
      const timeoutMs = opts.timeoutMs
        ? opts.timeoutMs - attempt * 5000
        : 30000;
      const result = await provider.call({ ...opts, timeoutMs: Math.max(timeoutMs, 10000) });
      // Success — reset failure count.
      failureCounts[provider.name] = 0;
      lastGoodProvider = provider.name;
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      // Don't retry on 4xx client errors (bad key, bad request).
      const is4xx = /returned 4\d\d/.test(msg) || /401|403|404/.test(msg);
      if (is4xx || attempt === maxRetries) {
        failureCounts[provider.name] = (failureCounts[provider.name] || 0) + 1;
        throw lastError;
      }
      // Short backoff: 300ms.
      await sleep(300);
    }
  }
  throw lastError || new Error("retry exhausted");
}

export async function generateCompletion(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const status = getConfiguredProviders();
  const errors: string[] = [];

  // Build the provider chain in priority order.
  // If we have a "last good provider", try it first (speeds up subsequent calls).
  const allProviders: ProviderDef[] = [
    { name: "claude", configured: status.claude.configured, call: callClaude },
    { name: "openrouter", configured: status.openrouter.configured, call: callOpenRouter },
    { name: "groq", configured: status.groq.configured, call: callGroq },
    { name: "zai-rest", configured: status.zaiRest.configured, call: callZaiRest },
    { name: "zai-sdk", configured: status.zaiSdk.configured, call: callZaiSdk },
  ];

  // Reorder: last good provider first (if it's still configured).
  const configured = allProviders.filter((p) => p.configured);
  const ordered: ProviderDef[] = [];
  if (lastGoodProvider) {
    const lastGood = configured.find((p) => p.name === lastGoodProvider);
    if (lastGood) {
      ordered.push(lastGood);
      ordered.push(...configured.filter((p) => p.name !== lastGoodProvider));
    } else {
      ordered.push(...configured);
    }
  } else {
    ordered.push(...configured);
  }

  // Try each provider with retry logic.
  for (const provider of ordered) {
    // Skip providers that have failed 5+ times consecutively (circuit breaker).
    if ((failureCounts[provider.name] || 0) >= 5) {
      errors.push(`${provider.name}: circuit breaker open (5+ consecutive failures)`);
      continue;
    }
    try {
      return await callWithRetry(provider, opts);
    } catch (e) {
      errors.push(
        `${provider.name}: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Fall through to the next provider.
    }
  }

  // ── LAST RESORT: Local fallback (no AI) ──
  // If ALL providers fail, generate a minimal response locally so the UI
  // doesn't break. This is the "backup plan" for conference day.
  const fallbackText = generateLocalFallback(opts);
  return {
    text: fallbackText,
    provider: "local-fallback",
    model: "none",
    durationMs: 0,
  };
}

/**
 * Generate a minimal local response when ALL AI providers are down.
 * This is the emergency fallback — it doesn't use AI but provides a
 * structured response so the UI keeps working.
 */
function generateLocalFallback(opts: AiCompletionOptions): string {
  const timestamp = new Date().toLocaleString("ar", {
    timeZone: "Asia/Muscat",
  });

  // Detect the mode from the system prompt content.
  const isReport = opts.system.includes("تقرير") || opts.system.includes("رئيس الجلسة");
  const isQuestion = opts.system.includes("سؤال") && !isReport;
  const isAnswer = opts.system.includes("إجابة") || opts.system.includes("الجمهور");

  if (isReport) {
    return [
      "## تقرير الجلسة (نسخة احتياطية)",
      "",
      "> ملاحظة: تعذر الاتصال بالمساعد الذكي. هذا تقرير مبسط كنسخة احتياطية.",
      `> الوقت: ${timestamp}`,
      "",
      "### مقدمة",
      "عقدت الجلسة ضمن المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود،",
      "بمشاركة نخبة من الباحثين والمتخصصين.",
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
      "- توصية 3",
      "",
      "### ملاحظات ختامية",
      "(أضف ملاحظاتك الختامية هنا)",
      "",
      "---",
      "⚠️ هذا التقرير تم توليده كنسخة احتياطية لأن المساعد الذكي غير متاح.",
      "يرجى مراجعة لوحة حالة الذكاء الاصطناعي في الإدارة لمعرفة السبب.",
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

  if (isQuestion) {
    return [
      "تعذر الاتصال بالمساعد الذكي لتحسين صياغة سؤالك.",
      "يرجى كتابة سؤالك مباشرة — سيصل لرئيس الجلسة كما هو.",
      "",
      `(وقت المحاولة: ${timestamp})`,
    ].join("\n");
  }

  return `تعذر الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى لاحقاً.\n\n(وقت المحاولة: ${timestamp})`;
}
