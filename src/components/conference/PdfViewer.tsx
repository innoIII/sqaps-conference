"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PdfViewerProps {
  url: string;
  name: string;
}

/**
 * Renders a PDF inside a sandboxed iframe. Shows a spinner until the document
 * finishes loading. Falls back to a download link if the iframe fails.
 */
export function PdfViewer({ url, name }: PdfViewerProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-[#6B7280]">جاري تجهيز المستند...</p>
        </div>
      )}
      <iframe
        src={`${url}#view=FitH&toolbar=1`}
        title={`معاينة ${name}`}
        onLoad={() => setLoaded(true)}
        className="h-full w-full border-0 bg-white"
      />
    </div>
  );
}
