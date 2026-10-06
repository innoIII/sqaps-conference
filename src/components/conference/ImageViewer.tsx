"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ImageViewerProps {
  url: string;
  name: string;
}

/**
 * Centers an image with object-contain so it scales to fit the available
 * modal space. Shows a spinner until the image loads.
 */
export function ImageViewer({ url, name }: ImageViewerProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0B1B3D]/5 p-2">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-[#6B7280]">جاري تحميل الصورة...</p>
        </div>
      )}
      <img
        src={url}
        alt={name}
        onLoad={() => setLoaded(true)}
        className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        style={{ display: loaded ? "block" : "none" }}
      />
    </div>
  );
}
