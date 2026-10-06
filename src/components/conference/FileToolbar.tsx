"use client";

import { ArrowDownWideNarrow, Layers } from "lucide-react";
import type { FileType } from "@/types";
import type { FilterType, SortMode } from "@/hooks/use-file-filters";

interface FileToolbarProps {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
  availableTypes: FileType[];
  totalCount: number;
  resultCount: number;
}

const FILTER_LABEL: Record<FilterType, string> = {
  all: "الكل",
  pdf: "PDF",
  image: "صور",
  video: "فيديو",
  html: "صفحات",
  text: "نصوص",
  document: "مستندات",
  unknown: "أخرى",
};

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "name", label: "الاسم" },
  { value: "size-desc", label: "الأكبر أولًا" },
  { value: "size-asc", label: "الأصغر أولًا" },
  { value: "type", label: "النوع" },
];

/**
 * Type filter chips + sort dropdown.
 * Shown above the file grid inside ContentCard.
 */
export function FileToolbar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  availableTypes,
  totalCount,
  resultCount,
}: FileToolbarProps) {
  const chips: FilterType[] = ["all", ...availableTypes];

  return (
    <div className="mb-5 flex flex-col gap-3">
      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280]">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          التصفية:
        </span>
        {chips.map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onFilterChange(c)}
              aria-pressed={active}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all",
                active
                  ? "border-[#0B1B3D] bg-[#0B1B3D] text-white shadow-sm"
                  : "border-[#E2E5EC] bg-white text-[#6B7280] hover:border-[#D4AF37]/50 hover:text-[#0B1B3D]",
              ].join(" ")}
              dir="rtl"
            >
              {FILTER_LABEL[c]}
            </button>
          );
        })}

        {/* Sort dropdown (trailing) */}
        <div className="relative ms-auto sm:w-40">
          <ArrowDownWideNarrow
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden
          />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            aria-label="ترتيب الملفات"
            className="h-8 w-full appearance-none rounded-full border border-[#E2E5EC] bg-white pr-9 pl-3 text-xs font-medium text-[#0B1B3D] transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            dir="rtl"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-[#9CA3AF]" dir="rtl">
          {resultCount} من {totalCount} ملف
        </span>
      </div>
    </div>
  );
}
