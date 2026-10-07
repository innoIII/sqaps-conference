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
 *   - "llama-3.3-70b-versatile"
 *   - "llama-3.1-8b-instant"
 *   - "mixtral-8x7b-32768"
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
    | "zai-sdk";
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
async function callGroq(opts: AiCompletionOptions): Promise<AiCompletionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const model = getGroqModel();
  const start = Date.now();
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
export async function generateCompletion(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const status = getConfiguredProviders();
  const errors: string[] = [];

  // Build the provider chain in priority order.
  const chain: ProviderDef[] = [
    {
      name: "claude",
      configured: status.claude.configured,
      call: callClaude,
    },
    {
      name: "openrouter",
      configured: status.openrouter.configured,
      call: callOpenRouter,
    },
    {
      name: "groq",
      configured: status.groq.configured,
      call: callGroq,
    },
    {
      name: "zai-rest",
      configured: status.zaiRest.configured,
      call: callZaiRest,
    },
    {
      name: "zai-sdk",
      configured: status.zaiSdk.configured,
      call: callZaiSdk,
    },
  ];

  // Try each configured provider in order.
  for (const provider of chain) {
    if (!provider.configured) continue;
    try {
      return await provider.call(opts);
    } catch (e) {
      errors.push(
        `${provider.name}: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Fall through to the next provider.
    }
  }

  throw new Error(
    `تعذر الاتصال بأي مزود ذكاء اصطناعي. التفاصيل: ${errors.join(" | ")}`,
  );
}
