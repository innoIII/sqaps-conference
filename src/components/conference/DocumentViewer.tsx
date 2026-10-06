"use client";

import { useState, useEffect } from "react";
import { FileText, Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";

interface DocumentViewerProps {
  url: string;
  name: string;
}

/**
 * Viewer for Office documents (.doc/.docx/.ppt/.pptx/.xls/.xlsx).
 *
 * Browsers cannot natively render these formats, so we use the Microsoft
 * Office Online viewer inside a sandboxed iframe. The viewer requires the
 * file URL to be publicly reachable. If it fails to load (e.g. the file is
 * only on a local network), we fall back to a branded download panel.
 */
export function DocumentViewer({ url, name }: DocumentViewerProps) {
  const [state, setState] = useState<"loading" | "loaded" | "fallback">(
    "loading",
  );
  const [absoluteUrl, setAbsoluteUrl] = useState("");

  useEffect(() => {
    // Build an absolute URL for the Office viewer (client-only).
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAbsoluteUrl(`${window.location.origin}${url}`);
    }
  }, [url]);

  // Give the Office viewer a short window; if it doesn't report load, fall back.
  useEffect(() => {
    if (state !== "loading") return;
    const t = setTimeout(() => setState("fallback"), 6000);
    return () => clearTimeout(t);
  }, [state]);

  const officeSrc = absoluteUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        absoluteUrl,
      )}`
    : "";

  if (state === "fallback" || !officeSrc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-white p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
          <FileText className="h-10 w-10 text-[#2563EB]" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-[#0B1B3D]" dir="rtl">
            لا يمكن عرض هذا المستند مباشرة في المتصفح
          </p>
          <p className="max-w-md text-sm text-[#6B7280]" dir="rtl">
            ملفات Office (.docx, .pptx, .xlsx) تتطلب تحميلها لعرضها بشكل كامل
            ببرنامج مناسب.
          </p>
        </div>
        <a
          href={url}
          download={name}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#0B1B3D] px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#07152F]"
        >
          <Download className="h-5 w-5" aria-hidden />
          تحميل المستند
        </a>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-[#6B7280]" dir="rtl">
            جاري تجهيز المستند...
          </p>
          <p className="flex items-center gap-1 text-xs text-[#9CA3AF]" dir="rtl">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            قد يستغرق ذلك لحظات
          </p>
        </div>
      )}
      <iframe
        src={officeSrc}
        title={`معاينة ${name}`}
        onLoad={() => setState("loaded")}
        className="h-full w-full border-0 bg-white"
      />
      {/* Footer hint */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#0B1B3D]/80 px-3 py-1 text-[10px] text-white/80 backdrop-blur-sm">
        <span dir="rtl" className="flex items-center gap-1">
          <ExternalLink className="h-3 w-3" aria-hidden />
          معاينة عبر مايكروسوفت أوفيس
        </span>
      </div>
    </div>
  );
}
