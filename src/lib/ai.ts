import Anthropic from "@anthropic-ai/sdk";

/**
 * Centralized AI provider layer.
 *
 * This module abstracts away the details of calling different AI providers
 * (Claude / z-ai REST / z-ai SDK) so the API routes can stay clean.
 *
 * Provider priority (highest first):
 *   1. Claude (Anthropic SDK)         — requires ANTHROPIC_API_KEY
 *   2. z-ai REST API (hardcoded cfg)  — always available on Vercel
 *   3. z-ai SDK (dynamic import)      — last resort (may fail on Vercel)
 *
 * On Vercel: set ANTHROPIC_API_KEY in the project env vars to use Claude as
 * the primary provider. If the key is missing or invalid, the request falls
 * back to z-ai automatically — so the AI always works for end users.
 */

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionResult {
  /** The generated text. */
  text: string;
  /** Which provider produced this result. */
  provider: "claude" | "zai-rest" | "zai-sdk";
  /** The model used (e.g. "claude-3-5-haiku-20241022" or "glm-4.6"). */
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
  return (
    process.env.ANTHROPIC_MODEL ||
    "claude-3-5-haiku-20241022"
  );
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
    zaiRest: {
      // z-ai REST always has a hardcoded fallback config — always "configured".
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

/** Convert a readable stream to a timeout-racing promise. */
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
 * Call z-ai via the REST API (hardcoded config — works on Vercel without
 * any env vars).
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
 * Call z-ai via the SDK (dynamic import). This is the last-resort fallback
 * because the SDK requires a config file that doesn't ship to Vercel.
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

/**
 * Generate an AI completion using the configured providers with automatic
 * fallback. Tries Claude first (if ANTHROPIC_API_KEY is set), then z-ai REST,
 * then z-ai SDK.
 *
 * Returns the first successful result. If all providers fail, throws an
 * Error with a user-friendly Arabic message.
 */
export async function generateCompletion(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const errors: string[] = [];

  // 1. Claude (primary) — only if API key is configured.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callClaude(opts);
    } catch (e) {
      errors.push(
        `Claude: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Fall through to next provider.
    }
  }

  // 2. z-ai REST API (always available — hardcoded config).
  try {
    return await callZaiRest(opts);
  } catch (e) {
    errors.push(
      `z-ai REST: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // 3. z-ai SDK (last resort).
  try {
    return await callZaiSdk(opts);
  } catch (e) {
    errors.push(
      `z-ai SDK: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  throw new Error(
    `تعذر الاتصال بأي مزود ذكاء اصطناعي. التفاصيل: ${errors.join(" | ")}`,
  );
}
