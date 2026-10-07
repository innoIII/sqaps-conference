import { NextResponse } from "next/server";
import {
  getProviderStatus,
  generateCompletion,
  getRuntimeHealth,
  resetAiCircuits,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/ai/health
 *
 * Returns:
 *   - providers: which providers are configured (static check, no network)
 *   - primary: the first configured provider in priority order
 *   - runtime: live runtime stats (last good provider, failure counts,
 *     circuit breakers) — useful for diagnosing issues on conference day
 */
export async function GET() {
  const providers = getProviderStatus();
  const runtime = getRuntimeHealth();
  const primary = providers.claude.configured
    ? "claude"
    : providers.openrouter.configured
      ? "openrouter"
      : providers.groq.configured
        ? "groq"
        : "zai-rest";
  return NextResponse.json({ providers, primary, runtime });
}

/**
 * DELETE /api/ai/health
 *
 * Resets all AI circuit breakers + failure counts. Use this if a provider
 * was temporarily down and you want to retry it immediately (instead of
 * waiting for the 5-failure circuit breaker to reset naturally).
 */
export async function DELETE() {
  resetAiCircuits();
  return NextResponse.json({ success: true, message: "Circuit breakers reset" });
}

/**
 * POST /api/ai/health
 *
 * Runs a real AI test (a tiny "say hello" prompt) and returns which provider
 * actually responded + the latency. Useful for verifying the AI works on
 * Vercel after deployment.
 *
 * Body (optional): { "verbose": true } to include the AI's response text.
 */
export async function POST(request: Request) {
  let verbose = false;
  try {
    const json = await request.json();
    verbose = Boolean(json?.verbose);
  } catch {
    // Body is optional — ignore parse errors.
  }

  try {
    const result = await generateCompletion({
      system:
        "أنت مساعد ذكي. أجب بكلمة واحدة فقط: 'مرحباً'. لا تكتب أي شيء آخر.",
      user: "اختبر",
      maxTokens: 20,
      temperature: 0,
      timeoutMs: 15000,
    });

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      response: verbose ? result.text : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 503 },
    );
  }
}
