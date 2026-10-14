"use client";

import { motion } from "framer-motion";

/**
 * Skeleton — a shimmering placeholder block for loading states.
 * Replaces spinners with a more modern skeleton UI.
 *
 * Usage:
 *   <Skeleton className="h-4 w-3/4" />
 *   <Skeleton className="h-12 w-full rounded-xl" />
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <motion.div
      aria-hidden
      animate={{
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`rounded-lg bg-gradient-to-r from-[#E2E5EC] via-[#F5F6F8] to-[#E2E5EC] ${className}`}
    />
  );
}

/**
 * ContentSkeleton — a full skeleton layout for the track content card.
 * Shows placeholder blocks for: header (4 cells) + papers table + report editor.
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-5 p-1">
      {/* Header skeleton — 4 info cells */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E2E5EC] bg-white p-4"
          >
            <Skeleton className="mb-2 h-2.5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      {/* Papers table skeleton */}
      <div className="rounded-2xl border border-[#E2E5EC] bg-white p-5">
        <Skeleton className="mb-4 h-5 w-1/4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Report editor skeleton */}
      <div className="rounded-2xl border border-[#E2E5EC] bg-white p-5">
        <Skeleton className="mb-3 h-5 w-1/3" />
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="mb-2 h-3 w-5/6" />
        <Skeleton className="mb-4 h-3 w-4/6" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
