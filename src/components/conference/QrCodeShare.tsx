"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import {
  QrCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

/**
 * QR Code Share — a premium card that displays a QR code for the /qn
 * audience question-submission page. Lets the admin:
 *   - Copy the URL to clipboard
 *   - Open the URL in a new tab
 *   - Download the QR code as a PNG (high-resolution for printing on banners)
 *   - Refresh the QR if needed
 *
 * Reads the current origin (so it works on localhost + Vercel).
 */
export function QrCodeShare() {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Read the current origin on mount (client-side only — avoids SSR issues).
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrigin(window.location.origin);
    }
  }, []);

  const qnUrl = useMemo(() => {
    if (!origin) return "http://localhost:3000/qn";
    return `${origin}/qn`;
  }, [origin]);

  // Display the URL with the protocol stripped for cleaner UI.
  const displayUrl = useMemo(() => qnUrl.replace(/^https?:\/\//, ""), [qnUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qnUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select + copy via execCommand.
      const ta = document.createElement("textarea");
      ta.value = qnUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // give up silently
      }
      document.body.removeChild(ta);
    }
  }, [qnUrl]);

  const handleDownload = useCallback(() => {
    // Find the canvas element rendered by QRCodeCanvas (inside our wrapper).
    const wrapper = document.getElementById("qr-share-canvas-wrapper");
    const canvas = wrapper?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    // Create a high-res version: scale the canvas up for print quality.
    const scale = 4; // 4x for crisp printing
    const size = canvas.width * scale;
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size + size / 5; // extra space for the URL label
    const ctx = out.getContext("2d");
    if (!ctx) return;

    // White background.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, out.width, out.height);

    // Draw the QR code scaled up.
    ctx.drawImage(canvas, 0, 0, size, size);

    // Add the URL label below.
    ctx.fillStyle = "#0B1B3D";
    ctx.font = `bold ${size / 20}px Cairo, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(displayUrl, size / 2, size + size / 12, size * 0.95);

    // Trigger download.
    const link = document.createElement("a");
    link.download = `sqaps-conference-qr.png`;
    link.href = out.toDataURL("image/png");
    link.click();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }, [displayUrl]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Force a re-render of the QR by toggling a small state change.
    setTimeout(() => setRefreshing(false), 500);
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
        <QrCode className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        <h3 className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
          رمز QR لصفحة الجمهور
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6">
        {/* QR Code — left side */}
        <div className="flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative rounded-2xl border-2 border-[#D4AF37]/30 bg-white p-4 shadow-md"
          >
            {/* Top-left corner ornaments (decorative) */}
            <span
              aria-hidden
              className="absolute -left-1 -top-1 h-4 w-4 rounded-bl-md border-b-2 border-l-2 border-[#D4AF37]"
            />
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-4 w-4 rounded-br-md border-b-2 border-r-2 border-[#D4AF37]"
            />
            <span
              aria-hidden
              className="absolute -left-1 -bottom-1 h-4 w-4 rounded-tl-md border-l-2 border-t-2 border-[#D4AF37]"
            />
            <span
              aria-hidden
              className="absolute -right-1 -bottom-1 h-4 w-4 rounded-tr-md border-r-2 border-t-2 border-[#D4AF37]"
            />

            {/* QR Canvas — wrapped for download lookup */}
            <div id="qr-share-canvas-wrapper" className="flex items-center justify-center">
              {!refreshing ? (
                <QRCodeCanvas
                  value={qnUrl}
                  size={180}
                  level="H"
                  marginSize={2}
                  fgColor="#0B1B3D"
                  bgColor="#FFFFFF"
                  imageSettings={{
                    src: "/logo/academy-logo.png",
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                </div>
              )}
            </div>
          </motion.div>

          <p
            className="text-center text-[11px] text-[#9CA3AF]"
            dir="rtl"
          >
            امسح الرمز بكاميرا هاتفك للوصول إلى صفحة طرح الأسئلة
          </p>
        </div>

        {/* URL + actions — right side */}
        <div className="flex flex-col gap-4">
          <div>
            <p
              className="mb-1 text-xs font-bold uppercase tracking-wide text-[#6B7280]"
              dir="rtl"
            >
              رابط صفحة الجمهور
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#D4AF37]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span
                className="min-w-0 flex-1 truncate text-xs font-medium text-[#0B1B3D]"
                dir="ltr"
                title={qnUrl}
              >
                {displayUrl}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2">
            <motion.button
              type="button"
              onClick={handleCopy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition-colors",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-[#0B1B3D] text-white hover:bg-[#07152F]",
              ].join(" ")}
              dir="rtl"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  تم نسخ الرابط
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  نسخ الرابط
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleDownload}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold shadow-sm transition-colors",
                downloaded
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-[#D4AF37]/40 bg-[#F4ECD0] text-[#0B1B3D] hover:bg-[#D4AF37]",
              ].join(" ")}
              dir="rtl"
            >
              {downloaded ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  تم التحميل
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" aria-hidden />
                  تحميل رمز QR (PNG)
                </>
              )}
            </motion.button>

            <div className="grid grid-cols-2 gap-2">
              <motion.a
                href={qnUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
                dir="rtl"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                فتح
              </motion.a>
              <motion.button
                type="button"
                onClick={handleRefresh}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5EC] bg-white px-3 text-xs font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50"
                dir="rtl"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                تحديث
              </motion.button>
            </div>
          </div>

          {/* Tip footer */}
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#F4ECD0]/40 p-3">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" aria-hidden />
            <p className="text-[11px] leading-relaxed text-[#0B1B3D]" dir="rtl">
              اطبع الرمز وضعه على شاشات العرض أو الكراسي ليسهل على الجمهور الوصول
              لصفحة طرح الأسئلة عبر كاميرا هواتفهم.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
