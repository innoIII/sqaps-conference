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
 * Returns the status of DeepSeek.
 */
export async function GET() {
  const providers = getProviderStatus();
  const runtime = getRuntimeHealth();
  const primary = providers.deepseek.configured ? "deepseek" : "none";
  return NextResponse.json({ providers, primary, runtime });
}

/**
 * DELETE /api/ai/health
 * Resets all circuit breakers.
 */
export async function DELETE() {
  resetAiCircuits();
  return NextResponse.json({ success: true, message: "Circuit breakers reset" });
}

/**
 * POST /api/ai/health
 * Runs a live AI test.
 */
export async function POST(request: Request) {
  let verbose = false;
  try {
    const json = await request.json();
    verbose = Boolean(json?.verbose);
  } catch {
    // Body is optional.
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
      ok: result.provider !== "local-fallback",
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      response: verbose ? result.text : undefined,
      errors: result.errors,
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
