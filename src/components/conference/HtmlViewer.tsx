"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

interface HtmlViewerProps {
  url: string;
  name: string;
}

/**
 * Renders an HTML file inside a sandboxed iframe (no allow-same-origin to keep
 * it isolated from the host app). Shows a spinner until loaded.
 */
export function HtmlViewer({ url, name }: HtmlViewerProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-[#6B7280]">جاري فتح الصفحة...</p>
        </div>
      )}
      <iframe
        src={url}
        title={`معاينة ${name}`}
        onLoad={() => setLoaded(true)}
        sandbox="allow-popups allow-forms"
        className="h-full w-full border-0 bg-white"
      />
    </div>
  );
}
