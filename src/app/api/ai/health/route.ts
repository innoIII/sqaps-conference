import { NextResponse } from "next/server";
import { getProviderStatus, generateCompletion } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/ai/health
 *
 * Returns the status of each AI provider (configured / not configured) +
 * which model would be used. Does NOT make a network call.
 *
 * Response:
 *   {
 *     "providers": {
 *       "claude":  { "configured": true,  "model": "claude-3-5-haiku-20241022" },
 *       "zaiRest": { "configured": true,  "model": "glm-4.6" },
 *       "zaiSdk":  { "configured": true }
 *     },
 *     "primary": "claude"  // or "zai-rest" if Claude isn't configured
 *   }
 */
export async function GET() {
  const providers = getProviderStatus();
  // Primary = first configured provider in priority order.
  const primary = providers.claude.configured
    ? "claude"
    : providers.openrouter.configured
      ? "openrouter"
      : providers.groq.configured
        ? "groq"
        : "zai-rest";
  return NextResponse.json({ providers, primary });
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
      timeoutMs: 20000,
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
