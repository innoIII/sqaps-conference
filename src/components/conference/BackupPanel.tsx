"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Download,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  Calendar,
  HardDrive,
} from "lucide-react";

/**
 * Backup Panel — lets the admin export all data as a JSON file.
 * The backup includes:
 *   - All site content (titles, schedule, track names)
 *   - All session data (time, venue, chair, secretary)
 *   - All research papers (titles, researchers, PDF URLs)
 *   - All session reports (general + per-paper)
 *   - All audience questions (metadata)
 *
 * PDFs are NOT included (too large) — but their URLs are, so they can be
 * re-downloaded from the server.
 */
export function BackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [exportedAt, setExportedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `sqaps-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تصدير البيانات");
    } finally {
      setExporting(false);
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
      <div className="flex items-center gap-2 border-b border-[#E2E5EC] bg-[#F5F6F8] px-5 py-3">
        <Database className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
          النسخة الاحتياطية
        </h3>
      </div>

      <div className="space-y-4 p-5">
        {/* Info card */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4ECD0]/40 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                احمِ بياناتك بنسخة احتياطية
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#374151]" dir="rtl">
                يُصدّر هذا الخيار جميع بيانات الموقع في ملف JSON واحد يشمل:
                المحاور، الجلسات، الأوراق البحثية، التقارير، الأسئلة، ومحتوى الموقع.
              </p>
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] p-3 text-center">
            <HardDrive className="mx-auto mb-1 h-4 w-4 text-[#D4AF37]" aria-hidden />
            <p className="text-[10px] font-bold text-[#0B1B3D]" dir="rtl">المحاور + الجدول</p>
          </div>
          <div className="rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] p-3 text-center">
            <HardDrive className="mx-auto mb-1 h-4 w-4 text-[#D4AF37]" aria-hidden />
            <p className="text-[10px] font-bold text-[#0B1B3D]" dir="rtl">الجلسات + الأوراق</p>
          </div>
          <div className="rounded-lg border border-[#E2E5EC] bg-[#F5F6F8] p-3 text-center">
            <HardDrive className="mx-auto mb-1 h-4 w-4 text-[#D4AF37]" aria-hidden />
            <p className="text-[10px] font-bold text-[#0B1B3D]" dir="rtl">التقارير + الأسئلة</p>
          </div>
        </div>

        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-6 text-sm font-bold text-[#D4AF37] shadow-lg transition hover:shadow-xl disabled:opacity-50"
          dir="rtl"
        >
          {exporting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              جاري التصدير...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" aria-hidden />
              تصدير نسخة احتياطية
            </>
          )}
        </button>

        {/* Status */}
        {exportedAt && !error && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
            <div className="flex-1">
              <p className="text-xs font-bold text-green-800" dir="rtl">
                تم التصدير بنجاح
              </p>
              <p className="flex items-center gap-1 text-[10px] text-green-700" dir="rtl">
                <Calendar className="h-2.5 w-2.5" />
                {exportedAt.toLocaleString("ar")}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#B91C1C]" aria-hidden />
            <p className="text-xs font-semibold text-[#B91C1C]" dir="rtl">
              {error}
            </p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-xl bg-[#0B1B3D] p-4 text-white">
          <p className="text-xs font-bold text-[#D4AF37]" dir="rtl">
            💡 نصيحة
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/80" dir="rtl">
            احفظ ملف النسخة الاحتياطية في مكان آمن (OneDrive / Google Drive).
            يُنصح بتصدير نسخة قبل المؤتمر + نسخة بعد كل يوم من أيام المؤتمر.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
