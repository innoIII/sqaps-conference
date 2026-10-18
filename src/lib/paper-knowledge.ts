import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf-extract";

/**
 * Everything the AI assistant ("المفكّر") knows about a research paper.
 *
 * Papers and CVs for the conference are static files committed to the repo:
 *   public/papers/track-N/paper-S.pdf  →  docs/papers/track-N/paper-S.md  (full text)
 *   public/papers/track-N/cv-S.pdf     →  docs/cv/track-N/cv-S.md         (CV + abstract page)
 *   docs/cards/track-N/paper-S.json    →  analysis card, built once by scripts/build-paper-cards.mjs
 *
 * Text is read from the .md files, not the PDFs: the booklet PDFs have a broken
 * font map, so their raw text extracts garbled. A PDF uploaded through the admin
 * panel (paper_files table) is still supported as a fallback.
 *
 * docs/ is shipped with the AI routes via outputFileTracingIncludes (next.config.ts).
 */

export interface PaperCard {
  /** "full" = built from the full paper, "abstract" = only the booklet abstract page. */
  source: "full" | "abstract";
  summary: string;
  problem: string;
  objectives: string[];
  methodology: string;
  sample: string;
  findings: string[];
  recommendations: string[];
  strengths: string[];
  gaps: string[];
  relevance: string;
  discussionQuestions: string[];
  keywords: string[];
}

const STATIC_FILE = /^\/papers\/track-(\d+)\/(paper|cv)-(\d+)\.pdf$/;
const DOCS = path.join(process.cwd(), "docs");

async function readDoc(...parts: string[]): Promise<string | null> {
  try {
    return await readFile(path.join(DOCS, ...parts), "utf8");
  } catch {
    return null;
  }
}

/** Body of a docs/*.md file (everything after the "## النص" heading). */
function mdBody(md: string): string {
  const marker = md.indexOf("## النص");
  return (marker >= 0 ? md.slice(marker + "## النص".length) : md).trim();
}

async function loadText(
  kind: "paper" | "cv",
  trackId: number,
  slot: number,
  url: string | null | undefined,
): Promise<string> {
  if (!url) return "";
  const m = STATIC_FILE.exec(url);
  if (m) {
    const folder = m[2] === "cv" ? "cv" : "papers";
    const md = await readDoc(folder, `track-${m[1]}`, `${m[2]}-${m[3]}.md`);
    return md ? mdBody(md) : "";
  }
  try {
    const row = await db.paperFile.findUnique({
      where: { trackId_slot_fileType: { trackId, slot, fileType: kind } },
    });
    return row ? await extractPdfText(row.data) : "";
  } catch {
    return "";
  }
}

/** Researcher CV page text (in the booklet it also carries the paper's abstract). */
export function loadCvText(trackId: number, slot: number, cvUrl: string | null | undefined) {
  return loadText("cv", trackId, slot, cvUrl);
}

/** Full text of the research paper (empty until the paper PDF is added). */
export function loadPaperText(trackId: number, slot: number, paperUrl: string | null | undefined) {
  return loadText("paper", trackId, slot, paperUrl);
}

/** Pre-built analysis card for a paper, or null if none exists yet. */
export async function loadCard(trackId: number, slot: number): Promise<PaperCard | null> {
  const raw = await readDoc("cards", `track-${trackId}`, `paper-${slot}.json`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PaperCard;
  } catch {
    return null;
  }
}

const list = (items: string[] | undefined) =>
  (items ?? []).filter(Boolean).map((x) => `- ${x}`).join("\n");

/** A card rendered as compact Arabic text for a prompt. */
export function cardToText(card: PaperCard): string {
  return [
    `الملخص: ${card.summary}`,
    `الإشكالية: ${card.problem}`,
    card.objectives?.length ? `الأهداف:\n${list(card.objectives)}` : "",
    `المنهج: ${card.methodology}`,
    card.sample ? `العينة/المصادر: ${card.sample}` : "",
    card.findings?.length ? `أبرز النتائج:\n${list(card.findings)}` : "",
    card.recommendations?.length ? `التوصيات:\n${list(card.recommendations)}` : "",
    card.strengths?.length ? `نقاط القوة:\n${list(card.strengths)}` : "",
    card.gaps?.length ? `الفجوات والملاحظات:\n${list(card.gaps)}` : "",
    card.relevance ? `الارتباط بمحور الجلسة: ${card.relevance}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PaperRef {
  slot: number;
  title?: string | null;
  researcher?: string | null;
  paperUrl?: string | null;
  cvUrl?: string | null;
}

export interface PaperDossier {
  slot: number;
  title: string;
  researchers: string;
  card: PaperCard | null;
  paperText: string;
  cvText: string;
  /** True when only the booklet abstract is available (no full paper yet). */
  abstractOnly: boolean;
}

/** Load everything known about one paper. */
export async function loadDossier(trackId: number, p: PaperRef): Promise<PaperDossier> {
  const [card, paperText, cvText] = await Promise.all([
    loadCard(trackId, p.slot),
    loadPaperText(trackId, p.slot, p.paperUrl),
    loadCvText(trackId, p.slot, p.cvUrl),
  ]);
  return {
    slot: p.slot,
    title: (p.title ?? "").trim(),
    researchers: (p.researcher ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("، "),
    card,
    paperText,
    cvText,
    abstractOnly: !paperText,
  };
}

/**
 * Prompt text for one paper. `depth` controls how much raw text is included:
 *   "card" → card (or the abstract page when there is no card yet)
 *   "full" → card + the paper's full text (capped) + the CV page
 */
export function dossierToText(d: PaperDossier, depth: "card" | "full", maxChars = 40000): string {
  const head = [
    `الورقة رقم ${d.slot}: ${d.title || "بدون عنوان"}`,
    d.researchers ? `الباحث/الباحثون: ${d.researchers}` : "",
    d.abstractOnly ? "(المتاح: صفحة الملخص في كتيب المؤتمر فقط — النص الكامل غير مرفوع بعد)" : "",
  ].filter(Boolean);

  const parts: string[] = [head.join("\n")];
  if (d.card) parts.push(`=== بطاقة التحليل ===\n${cardToText(d.card)}`);
  if (depth === "full") {
    if (d.paperText) parts.push(`=== النص الكامل للورقة ===\n${d.paperText.slice(0, maxChars)}`);
    if (d.cvText) parts.push(`=== صفحة الباحث والملخص (كتيب المؤتمر) ===\n${d.cvText.slice(0, 6000)}`);
  } else if (!d.card && d.cvText) {
    parts.push(`=== صفحة الباحث والملخص (كتيب المؤتمر) ===\n${d.cvText.slice(0, 4000)}`);
  }
  return parts.join("\n\n");
}
