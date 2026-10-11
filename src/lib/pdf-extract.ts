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
