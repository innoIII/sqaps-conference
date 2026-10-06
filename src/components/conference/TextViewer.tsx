"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TextViewerProps {
  url: string;
  name: string;
}

/**
 * Fetches and renders plain text content in a scrollable, RTL-aware reader.
 */
export function TextViewer({ url, name }: TextViewerProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(null);
    setError(false);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then((body) => {
        if (active) setText(body);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-6 text-center">
        <p className="text-sm text-[#6B7280]">تعذر تحميل محتوى الملف النصي.</p>
      </div>
    );
  }

  if (text === null) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        <p className="text-sm text-[#6B7280]">جاري قراءة الملف...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto scroll-elegant bg-white p-5 sm:p-7">
      <pre
        className="whitespace-pre-wrap break-words font-cairo text-sm leading-relaxed text-[#0B1B3D]"
        dir="auto"
        aria-label={`محتوى ${name}`}
      >
        {text}
      </pre>
    </div>
  );
}
