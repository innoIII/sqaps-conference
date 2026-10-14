"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ProviderStatus {
  deepseek: { configured: boolean; model: string };
}

interface HealthResponse {
  providers: ProviderStatus;
  primary: string;
  runtime: {
    lastGoodProvider: string | null;
    failureCounts: Record<string, number>;
    circuitBreakersOpen: string[];
  };
}

interface TestResponse {
  ok: boolean;
  provider?: string;
  model?: string;
  durationMs?: number;
  response?: string;
  error?: string;
  errors?: string[];
}

/**
 * AI Status Panel — DeepSeek only.
 */
export function AiStatusPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResponse | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/health", { cache: "no-store" });
      if (res.ok) {
        setHealth(await res.json());
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verbose: true }),
      });
      const data = (await res.json()) as TestResponse;
      setTestResult(data);
    } catch (e) {
      setTestResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
            حالة الذكاء الاصطناعي
          </h3>
        </div>
        <button
          type="button"
          onClick={loadHealth}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E5EC] bg-white px-2 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50 disabled:opacity-50"
          dir="rtl"
        >
          <RefreshCw
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          تحديث
        </button>
      </div>

      <div className="space-y-4 p-5">
        {/* Provider status */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
            <span className="text-sm" dir="rtl">
              جاري الفحص...
            </span>
          </div>
        ) : health ? (
          <>
            {/* Primary badge */}
            <div
              className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-gradient-to-l from-[#F4ECD0]/60 to-[#F5F6F8] p-3"
              dir="rtl"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
                <Zap className="h-4 w-4" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-xs text-[#6B7280]">المزود</p>
                <p className="text-sm font-bold text-[#0B1B3D]">
                  {health.primary === "deepseek"
                    ? "DeepSeek"
                    : "غير مهيأ"}
                </p>
              </div>
              {health.providers.deepseek.configured ? (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                  نشط
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-[#B91C1C]">
                  غير مهيأ
                </span>
              )}
            </div>

            {/* DeepSeek card */}
            <div
              className={[
                "relative rounded-xl border p-3",
                health.providers.deepseek.configured
                  ? "border-[#D4AF37] bg-[#F4ECD0]/40 shadow-sm"
                  : "border-[#E2E5EC] bg-[#F5F6F8]",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    health.providers.deepseek.configured
                      ? "bg-[#0B1B3D] text-[#D4AF37]"
                      : "bg-[#E2E5EC] text-[#9CA3AF]",
                  ].join(" ")}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-xs font-bold text-[#0B1B3D]">
                  DeepSeek
                </span>
                {health.providers.deepseek.configured ? (
                  <CheckCircle2 className="ms-auto h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="ms-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                )}
              </div>
              <p
                className="mt-1.5 truncate text-[10px] text-[#6B7280]"
                dir="ltr"
              >
                {health.providers.deepseek.model}
              </p>
              {health.runtime.failureCounts.deepseek > 0 && (
                <p className="mt-0.5 text-[9px] text-amber-600" dir="rtl">
                  {health.runtime.failureCounts.deepseek} محاولة فاشلة
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-8 text-[#B91C1C]">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm" dir="rtl">
              تعذر فحص الحالة
            </span>
          </div>
        )}

        {/* Test button */}
        <div className="border-t border-[#E2E5EC] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-[#0B1B3D]" dir="rtl">
              اختبار الاتصال المباشر
            </p>
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0B1B3D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#07152F] disabled:opacity-50"
              dir="rtl"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  جاري الاختبار...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                  اختبار الآن
                </>
              )}
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                "rounded-xl border p-3",
                testResult.ok
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50",
              ].join(" ")}
            >
              {testResult.ok ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-green-800" dir="rtl">
                      الاتصال ناجح عبر {testResult.provider}
                    </p>
                    <p className="mt-0.5 text-green-700" dir="rtl">
                      النموذج: {testResult.model} · الزمن:{" "}
                      {testResult.durationMs} مللي ثانية
                    </p>
                    {testResult.response && (
                      <p
                        className="mt-1 rounded bg-white px-2 py-1 text-green-800"
                        dir="rtl"
                      >
                        الرد: «{testResult.response}»
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-[#B91C1C]" dir="rtl">
                      فشل الاتصال
                    </p>
                    {testResult.error && (
                      <p className="mt-0.5 text-[#B91C1C]/80" dir="rtl">
                        {testResult.error}
                      </p>
                    )}
                    {testResult.errors && testResult.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {testResult.errors.map((err, i) => (
                          <p
                            key={i}
                            className="rounded bg-white/60 px-2 py-1 text-[10px] text-[#B91C1C]/90"
                            dir="rtl"
                          >
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Help */}
        <div className="rounded-xl bg-[#F4ECD0]/40 p-3">
          <p className="text-[11px] leading-relaxed text-[#0B1B3D]" dir="rtl">
            لتفعيل الذكاء الاصطناعي، أضف{" "}
            <code className="rounded bg-white px-1 py-0.5 text-[10px] font-mono">
              DEEPSEEK_API_KEY
            </code>{" "}
            في إعدادات Vercel. احصل على مفتاح من{" "}
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              platform.deepseek.com
            </a>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
