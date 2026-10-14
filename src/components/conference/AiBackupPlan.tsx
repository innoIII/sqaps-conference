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
    deepseek: { configured: boolean; model: string };
  };
  primary: string;
  runtime: RuntimeHealth;
}

/**
 * AI Backup Plan Panel — DeepSeek only.
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
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} aria-hidden />
          تحديث
        </button>
      </div>

      <div className="space-y-4 p-5">
        {/* Status banner */}
        <div className={`flex items-center gap-3 rounded-xl border ${statusConfig.bg} ${statusConfig.border} p-4`}>
          <statusConfig.icon className={`h-8 w-8 shrink-0 ${statusConfig.color}`} aria-hidden />
          <div className="flex-1">
            <p className={`text-sm font-bold ${statusConfig.color}`} dir="rtl">
              {statusConfig.label}
            </p>
            <p className="text-[11px] text-[#6B7280]" dir="rtl">
              {status === "operational"
                ? "DeepSeek يعمل — لا توجد مشاكل"
                : status === "degraded"
                  ? "DeepSeek به مشاكل — راجع الأخطاء أدناه"
                  : "تعذر تحميل حالة النظام"}
            </p>
          </div>
          <span className="text-[10px] text-[#9CA3AF]" dir="rtl">
            (تحديث تلقائي كل ٣٠ ثانية)
          </span>
        </div>

        {/* DeepSeek status */}
        {health?.runtime && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]" dir="rtl">
              <Activity className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              حالة DeepSeek المباشرة
            </h4>
            <div
              className={[
                "relative rounded-lg border p-2.5",
                (health.runtime.failureCounts.deepseek || 0) >= 5
                  ? "border-red-300 bg-red-50"
                  : health.runtime.lastGoodProvider === "deepseek"
                    ? "border-green-300 bg-green-50"
                    : "border-[#E2E5EC] bg-white",
              ].join(" ")}
            >
              {health.runtime.lastGoodProvider === "deepseek" && (
                <span className="absolute -top-1.5 right-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-bold text-white" dir="rtl">
                  نشط
                </span>
              )}
              <p className="text-[10px] font-bold text-[#0B1B3D]" dir="rtl">DeepSeek</p>
              {!health.providers.deepseek.configured ? (
                <p className="text-[9px] text-[#9CA3AF]" dir="rtl">غير مهيأ</p>
              ) : (health.runtime.failureCounts.deepseek || 0) >= 5 ? (
                <p className="text-[9px] font-bold text-red-600" dir="rtl">معطل (٥+ فشل)</p>
              ) : (health.runtime.failureCounts.deepseek || 0) > 0 ? (
                <p className="text-[9px] text-amber-600" dir="rtl">{health.runtime.failureCounts.deepseek} محاولة فاشلة</p>
              ) : (
                <p className="text-[9px] text-green-600" dir="rtl">سليم</p>
              )}
            </div>
          </div>
        )}

        {/* Emergency actions */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]" dir="rtl">
            <Zap className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            إجراءات الطوارئ
          </h4>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:bg-[#F4ECD0] disabled:opacity-50"
            dir="rtl"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            )}
            إعادة تشغيل القواطع
          </button>
        </div>

        {/* Backup plan */}
        <div className="rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]" dir="rtl">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            خطة الطوارئ
          </h4>
          <ol className="space-y-2 text-[11px] leading-relaxed text-[#374151]" dir="rtl">
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B1B3D] text-[9px] font-bold text-[#D4AF37]">١</span>
              <span><strong>إعادة المحاولة</strong> — DeepSeek يُعاد محاولته مرة واحدة قبل الانتقال للنسخة الاحتياطية.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0B1B3D] text-[9px] font-bold text-[#D4AF37]">٢</span>
              <span><strong>قاطع الدائرة</strong> — بعد ٥ محاولات فاشلة، يُعطل DeepSeek مؤقتاً. اضغط "إعادة تشغيل القواطع" لإعادة المحاولة.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-[#0B1B3D]">٣</span>
              <span><strong>النسخة الاحتياطية المحلية</strong> — إذا فشل DeepSeek، يُولد النظام رداً مبسطاً محلياً (بدون AI) حتى لا تتعطل الواجهة.</span>
            </li>
          </ol>
        </div>
      </div>
    </motion.div>
  );
}
