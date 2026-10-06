"use client";

interface VideoViewerProps {
  url: string;
  name: string;
}

/**
 * Native HTML5 video player with controls, responsive sizing.
 */
export function VideoViewer({ url, name }: VideoViewerProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black p-2">
      <video
        controls
        playsInline
        className="max-h-full max-w-full rounded-lg"
        title={`تشغيل ${name}`}
      >
        <source src={url} />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  );
}
