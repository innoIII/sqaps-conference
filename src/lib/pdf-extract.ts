/**
 * Multi-layer PDF text extractor.
 *
 * Tries 3 methods in order:
 *   1. pdf-parse (v1.1.4) — best for most PDFs
 *   2. Raw text extraction (regex) — fallback for scanned/encoded PDFs
 *   3. Binary string search — last resort, finds any readable text
 *
 * Returns the longest text found, or empty string if all fail.
 */

/**
 * Method 1: pdf-parse library (most accurate).
 */
async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

/**
 * Method 2: Raw regex extraction (fallback).
 * Searches for text in PDF content streams: Tj, TJ, BT/ET blocks.
 */
function extractWithRegex(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    const texts: string[] = [];

    // Pattern 1: (text) Tj
    const tjRegex = /\(([^)]{2,})\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 1) texts.push(text);
    }

    // Pattern 2: [array] TJ
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(raw)) !== null) {
      const block = match[1] || "";
      const parts = block.match(/\(([^)]+)\)/g);
      if (parts) {
        const text = parts
          .map((p) => p.replace(/[()]/g, ""))
          .join("")
          .trim();
        if (text.length > 1) texts.push(text);
      }
    }

    // Pattern 3: BT...ET blocks (catch-all)
    const btRegex = /BT\s+([\s\S]*?)\s+ET/g;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[1] || "";
      const parts = block.match(/\(([^)]+)\)/g);
      if (parts) {
        for (const part of parts) {
          const text = part.replace(/[()]/g, "").trim();
          if (text && text.length > 1) texts.push(text);
        }
      }
    }

    return texts.join(" ").trim();
  } catch {
    return "";
  }
}

/**
 * Method 3: Binary string search (last resort).
 * Scans the entire PDF for readable UTF-8/ASCII text sequences.
 */
function extractWithBinarySearch(buffer: Buffer): string {
  try {
    const raw = buffer.toString("utf8");
    const texts: string[] = [];

    // Find sequences of 4+ printable characters (Arabic + Latin + digits).
    // Arabic Unicode range: \u0600-\u06FF, Latin: a-zA-Z, digits: 0-9
    const textRegex = /[\u0600-\u06FFa-zA-Z0-9\u060C\u061B\u061F\s]{4,}/g;
    let match;
    while ((match = textRegex.exec(raw)) !== null) {
      const text = match[0]?.trim();
      // Filter out garbage (long sequences of single chars or repeated patterns).
      if (text && text.length > 10 && !/^(\S)\1{10,}$/.test(text)) {
        texts.push(text);
      }
    }

    return texts.join(" ").trim();
  } catch {
    return "";
  }
}

/**
 * Main entry point: tries all 3 methods and returns the best result.
 */
export async function extractPdfText(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, "base64");

    // Try all 3 methods.
    const [result1, result2, result3] = await Promise.all([
      extractWithPdfParse(buffer),
      Promise.resolve(extractWithRegex(buffer)),
      Promise.resolve(extractWithBinarySearch(buffer)),
    ]);

    // Return the longest non-empty result.
    const results = [result1, result2, result3].filter((r) => r.length > 0);
    if (results.length === 0) return "";

    // Sort by length (longest first) and return the best.
    results.sort((a, b) => b.length - a.length);
    return results[0];
  } catch {
    return "";
  }
}

/**
 * Structured paper info — extracts meaningful sections from raw PDF text.
 *
 * Looks for common academic section markers (Arabic + English) and returns
 * each section separately so the AI agent gets richer, organized context
 * instead of a wall of raw text.
 */
export interface StructuredPaperInfo {
  abstract?: string;
  problem?: string;
  methodology?: string;
  results?: string;
  recommendations?: string;
  references?: string;
}

/**
 * Extract structured info from raw PDF text by looking for section headings.
 *
 * Supports Arabic + English academic section markers:
 *   - الملخص / Abstract / Summary
 *   - الإشكالية / المشكلة / Problem
 *   - المنهجية / Methodology / Method
 *   - النتائج / Results / Findings
 *   - التوصيات / Recommendations
 *   - المراجع / References / Bibliography
 */
export function extractStructuredPaperInfo(rawText: string): StructuredPaperInfo {
  const info: StructuredPaperInfo = {};
  if (!rawText || rawText.length < 50) return info;

  // Normalize whitespace.
  const text = rawText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // Section patterns — each captures text until the next section marker.
  // We use case-insensitive matching for English.
  const sections: Array<{ key: keyof StructuredPaperInfo; patterns: RegExp[] }> = [
    {
      key: "abstract",
      patterns: [
        /(?:الملخص|المُلخّص|الملخصة)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:الإشكالية|المشكلة|المنهجية|النتائج|التوصيات|المراجع|الكلمات المفتاحية|Introduction|Problem|Methodology|Results|Recommendations|References|Keywords)\b|$)/i,
        /(?:Abstract|Summary)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:Introduction|Problem|Methodology|Results|Recommendations|References|Keywords|الملخص|الإشكالية|المنهجية|النتائج)\b|$)/i,
      ],
    },
    {
      key: "problem",
      patterns: [
        /(?:الإشكالية|المشكلة البحثية|مشكلة البحث|الإشكالية البحثية)\s*[:：]?\s*([\s\S]{30,600}?)(?=\n\s*(?:المنهجية|النتائج|التوصيات|المراجع|الأهداف|Methodology|Results|Recommendations|References|Objectives)\b|$)/i,
        /(?:Problem Statement|Research Problem|Problem)\s*[:：]?\s*([\s\S]{30,600}?)(?=\n\s*(?:Methodology|Results|Recommendations|References|Objectives|المنهجية|النتائج)\b|$)/i,
      ],
    },
    {
      key: "methodology",
      patterns: [
        /(?:المنهجية|منهجية البحث|المنهج|إجراءات البحث)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:النتائج|التوصيات|المراجع|التحليل|Results|Recommendations|References|Analysis)\b|$)/i,
        /(?:Methodology|Method|Research Method)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:Results|Recommendations|References|Analysis|النتائج|التوصيات)\b|$)/i,
      ],
    },
    {
      key: "results",
      patterns: [
        /(?:النتائج|النتائج البحثية|أهم النتائج|النتائج والتوصيات)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:التوصيات|المراجع|الخاتمة|المناقشة|Recommendations|References|Conclusion|Discussion)\b|$)/i,
        /(?:Results|Findings)\s*[:：]?\s*([\s\S]{30,800}?)(?=\n\s*(?:Recommendations|References|Conclusion|Discussion|التوصيات|المراجع|الخاتمة)\b|$)/i,
      ],
    },
    {
      key: "recommendations",
      patterns: [
        /(?:التوصيات|أهم التوصيات|التوصيات المقترحة)\s*[:：]?\s*([\s\S]{30,600}?)(?=\n\s*(?:المراجع|الخاتمة|الخلاصة|References|Conclusion)\b|$)/i,
        /(?:Recommendations|Suggestions)\s*[:：]?\s*([\s\S]{30,600}?)(?=\n\s*(?:References|Conclusion|Bibliography|المراجع|الخاتمة)\b|$)/i,
      ],
    },
    {
      key: "references",
      patterns: [
        /(?:المراجع|قائمة المراجع|المصادر|المراجع العلمية)\s*[:：]?\s*([\s\S]{30,1500}?)(?:\n\s*(?:الملاحق|Appendix| Annex)\b|$)/i,
        /(?:References|Bibliography|Works Cited)\s*[:：]?\s*([\s\S]{30,1500}?)(?:\n\s*(?:Appendix|Annex|الملاحق)\b|$)/i,
      ],
    },
  ];

  for (const section of sections) {
    for (const pattern of section.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length >= 30) {
          info[section.key] = value.slice(0, 800); // Cap at 800 chars.
          break; // Found this section, move to next.
        }
      }
    }
  }

  return info;
}
