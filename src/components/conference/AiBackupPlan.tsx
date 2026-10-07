"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Activity,
  Power,
  Lightbulb,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface RuntimeHealth {
  lastGoodProvider: string | null;
  failureCounts: Record<string, number>;
  circuitBreakersOpen: string[];
}

interface HealthResponse {
  providers: {
    claude: { configured: boolean; model: string };
    openrouter: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
    zaiRest: { configured: boolean; model: string };
    zaiSdk: { configured: boolean };
  };
  primary: string;
  runtime: RuntimeHealth;
}

/**
 * AI Backup Plan Panel — a comprehensive reliability dashboard for the AI
 * agent. Shows:
 *   - Overall system status (operational / degraded / down)
 *   - Runtime health (last good provider, failure counts, circuit breakers)
 *   - Backup plan explanation (what happens if each provider fails)
 *   - Emergency actions (reset circuit breakers, test connection)
 *   - Conference day checklist
 */
export function AiBackupPlan() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/health", { cache: "no-store" });
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    // Auto-refresh every 30s (for conference day monitoring).
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await fetch("/api/ai/health", { method: "DELETE" });
      await loadHealth();
    } finally {
      setResetting(false);
    }
  }, [loadHealth]);

  // Determine overall status.
  const status: "operational" | "degraded" | "down" =
    !health ? "down" : health.runtime.circuitBreakersOpen.length === 0
      ? "operational"
      : "degraded";

  const statusConfig = {
    operational: {
      label: "النظام يعمل بشكل طبيعي",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      icon: CheckCircle2,
    },
    degraded: {
      label: "النظام يعمل بقدرة مخفضة",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: AlertTriangle,
    },
    down: {
      label: "النظام غير متاح",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: XCircle,
    },
  }[status];

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
          <ShieldCheck className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
            خطة الطوارئ — ضمان تشغيل الوكيل
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
        {/* Overall status banner */}
        <div
          className={`flex items-center gap-3 rounded-xl border ${statusConfig.bg} ${statusConfig.border} p-4`}
        >
          <statusConfig.icon
            className={`h-8 w-8 shrink-0 ${statusConfig.color}`}
            aria-hidden
          />
          <div className="flex-1">
            <p
              className={`text-sm font-bold ${statusConfig.color}`}
              dir="rtl"
            >
              {statusConfig.label}
            </p>
            <p className="text-[11px] text-[#6B7280]" dir="rtl">
              {status === "operational"
                ? "جميع المزودات يعملون — لا توجد مشاكل"
                : status === "degraded"
                  ? `${health?.runtime.circuitBreakersOpen.length || 0} مزود معطل — يعمل النظام عبر المزودات الأخرى`
                  : "تعذر تحميل حالة النظام — تحقق من الاتصال"}
            </p>
          </div>
          <span className="text-[10px] text-[#9CA3AF]" dir="rtl">
            (تحديث تلقائي كل ٣٠ ثانية)
          </span>
        </div>

        {/* Runtime health — failure counts + circuit breakers */}
        {health?.runtime && (
          <div>
            <h4
              className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]"
              dir="rtl"
            >
              <Activity className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              حالة المزودات المباشرة
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {["claude", "openrouter", "groq", "zai-rest", "zai-sdk"].map(
                (name) => {
                  const failures = health.runtime.failureCounts[name] || 0;
                  const isOpen = failures >= 5;
                  const configured =
                    name === "claude"
                      ? health.providers.claude.configured
                      : name === "openrouter"
                        ? health.providers.openrouter.configured
                        : name === "groq"
                          ? health.providers.groq.configured
                          : true;
                  const isLastGood = health.runtime.lastGoodProvider === name;
                  return (
                    <div
                      key={name}
                      className={[
                        "relative rounded-lg border p-2.5",
                        isOpen
                          ? "border-red-300 bg-red-50"
                          : isLastGood
                            ? "border-green-300 bg-green-50"
                            : "border-[#E2E5EC] bg-white",
                      ].join(" ")}
                    >
                      {isLastGood && (
                        <span
                          className="absolute -top-1.5 right-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-bold text-white"
                          dir="rtl"
                        >
                          نشط
                        </span>
                      )}
                      <p
                        className="truncate text-[10px] font-bold text-[#0B1B3D]"
                        dir="rtl"
                      >
                        {name}
                      </p>
                      {!configured ? (
                        <p className="text-[9px] text-[#9CA3AF]" dir="rtl">
                          غير مهيأ
                        </p>
                      ) : isOpen ? (
                        <p className="text-[9px] font-bold text-red-600" dir="rtl">
                          معطل ({failures} فشل)
                        </p>
                      ) : failures > 0 ? (
                        <p className="text-[9px] text-amber-600" dir="rtl">
                          {failures} محاولة فاشلة
                        </p>
                      ) : (
                        <p className="text-[9px] text-green-600" dir="rtl">
                          سليم
                        </p>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Emergency actions */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-3">
          <h4
            className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]"
            dir="rtl"
          >
            <Zap className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            إجراءات الطوارئ
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:bg-[#F4ECD0] disabled:opacity-50"
              dir="rtl"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              )}
              إعادة تشغيل القواطع
            </button>
            <a
              href="/api/ai/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
              dir="rtl"
            >
              <Power className="h-3.5 w-3.5" aria-hidden />
              فحص API مباشر
            </a>
          </div>
          <p className="mt-2 text-[10px] text-[#6B7280]" dir="rtl">
            إذا تعطل أحد المزودات مؤقتاً، اضغط "إعادة تشغيل القواطع" لإعادة
            المحاولة فوراً بدلاً من انتظار الإعادة التلقائية.
          </p>
        </div>

        {/* Backup plan explanation */}
        <div className="rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4">
          <h4
            className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]"
            dir="rtl"
          >
            <Lightbulb className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            خطة الطوارئ — ماذا يحدث عند فشل مزود؟
          </h4>
          <ol
            className="space-y-2 text-[11px] leading-relaxed text-[#374151]"
            dir="rtl"
          >
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B1B3D] text-[9px] font-bold text-[#D4AF37]">
                ١
              </span>
              <span>
                <strong>إعادة المحاولة</strong> — كل مزود يُعاد محاولته مرتين
                مع تأخير متزايد (٥٠٠ms ثم ١٥٠٠ms) قبل الانتقال للتالي.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B1B3D] text-[9px] font-bold text-[#D4AF37]">
                ٢
              </span>
              <span>
                <strong>الانتقال التلقائي</strong> — عند فشل مزود، ينتقل
                النظام تلقائياً للمزود التالي: Claude ← OpenRouter ← Groq ← z-ai.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B1B3D] text-[9px] font-bold text-[#D4AF37]">
                ٣
              </span>
              <span>
                <strong>قاطع الدائرة</strong> — بعد ٥ محاولات فاشلة متتالية،
                يُعطل المزود مؤقتاً (لا يُجرب مرة أخرى حتى تعيد تشغيل القواطع).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-[#0B1B3D]">
                ٤
              </span>
              <span>
                <strong>النسخة الاحتياطية المحلية</strong> — إذا فشل جميع
                المزودات، يُولد النظام رداً مبسطاً محلياً (بدون AI) حتى لا
                تتعطل الواجهة. سيظهر تنبيه "نسخة احتياطية" في الرد.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-[#0B1B3D]">
                ٥
              </span>
              <span>
                <strong>ذاكرة المزود النشط</strong> — النظام يتذكر آخر مزود
                نجح ويجربه أولاً في الطلبات التالية (تسريع الاستجابة).
              </span>
            </li>
          </ol>
        </div>

        {/* Conference day checklist */}
        <div className="rounded-xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#0B1B3D] to-[#07152F] p-4 text-white">
          <h4
            className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]"
            dir="rtl"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            قائمة فحص يوم المؤتمر
          </h4>
          <ul
            className="space-y-1.5 text-[11px] leading-relaxed text-white/85"
            dir="rtl"
          >
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>أضف مفتاحين على الأقل: OPENROUTER_API_KEY + GROQ_API_KEY (احتياط)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>اختبر الوكيل قبل المؤتمر: /admin → مشاركة / QR → اختبار الآن</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>راقب هذه اللوحة يوم المؤتمر — تتحدث كل ٣٠ ثانية</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>إذا تعطل AI: اضغط "إعادة تشغيل القواطع" — أو استخدم النسخة اليدوية</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>النسخة الاحتياطية المحلية تضمن أن الواجهة لا تتعطل أبداً</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
