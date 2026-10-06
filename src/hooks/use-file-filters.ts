"use client";

import { useMemo, useState } from "react";
import type { ContentFile, FileType } from "@/types";

export type FilterType = "all" | FileType;
export type SortMode = "name" | "size-desc" | "size-asc" | "type";

interface UseFileFiltersResult {
  query: string;
  setQuery: (q: string) => void;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  filtered: ContentFile[];
  /** Available types in the current track (for filter chips). */
  availableTypes: FileType[];
  resultCount: number;
  reset: () => void;
}

/** Filter + search + sort pipeline for a track's files. */
export function useFileFilters(files: ContentFile[]): UseFileFiltersResult {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortMode>("name");

  const availableTypes = useMemo(() => {
    const set = new Set<FileType>();
    files.forEach((f) => set.add(f.type));
    return Array.from(set);
  }, [files]);

  const filtered = useMemo(() => {
    let out = files;
    if (filter !== "all") {
      out = out.filter((f) => f.type === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((f) => f.name.toLowerCase().includes(q));
    }
    const sorted = [...out];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));
        break;
      case "size-desc":
        sorted.sort((a, b) => b.size - a.size);
        break;
      case "size-asc":
        sorted.sort((a, b) => a.size - b.size);
        break;
      case "type":
        sorted.sort(
          (a, b) =>
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "ar"),
        );
        break;
    }
    return sorted;
  }, [files, filter, query, sort]);

  const reset = () => {
    setQuery("");
    setFilter("all");
    setSort("name");
  };

  return {
    query,
    setQuery,
    filter,
    setFilter,
    sort,
    setSort,
    filtered,
    availableTypes,
    resultCount: filtered.length,
    reset,
  };
}
