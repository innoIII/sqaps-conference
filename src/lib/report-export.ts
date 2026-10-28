/**
 * Official export of a report (chair report, rapporteur minutes, evaluations,
 * closing statement) with the academy + conference letterhead.
 *
 *   printReport(doc)          → print-ready page; the browser's "Save as PDF"
 *   downloadWord(doc, name)   → .doc file (HTML that Word opens natively, RTL)
 *
 * The body is the plain formal text the editor holds: "أولاً: …" lines become
 * section headings, Markdown pipe tables become real tables, the rest are
 * paragraphs.
 */

export interface ExportDoc {
  /** Main heading, e.g. "تقرير رئيس الجلسة". */
  title: string;
  /** Second line, e.g. the session title. */
  subtitle?: string;
  /** Label/value rows shown under the heading. */
  meta?: [string, string][];
  /** Report text (plain, formal). */
  body: string;
  /** Signature lines at the end, e.g. ["رئيس الجلسة", "مقرر الجلسة"]. */
  signatures?: string[];
  /** Conference name for the letterhead. */
  conference?: string;
}

const ACADEMY = "أكاديمية السلطان قابوس لعلوم الشرطة";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SECTION = /^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً)\s*[:：]/;
const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => esc(c.trim()));

function bodyHtml(doc: ExportDoc): string {
  const lines = doc.body.replace(/\r/g, "").replace(/\*\*/g, "").split("\n");
  // The AI text usually repeats the document title and session name at the
  // top; the letterhead already shows them.
  const norm = (s: string) => s.replace(/[\s:：—–-]+/g, "");
  const heading = [doc.title, doc.subtitle ?? ""].map(norm).filter(Boolean);
  while (lines.length && (!lines[0].trim() || heading.some((h) => h.includes(norm(lines[0])) && norm(lines[0])))) {
    lines.shift();
  }
  const out: string[] = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (isRow(line)) {
      const rows: string[] = [];
      while (i < lines.length && isRow(lines[i])) rows.push(lines[i++]);
      const [head, ...rest] = rows.filter((r) => !isSeparator(r));
      out.push(
        `<table><thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rest
          .map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
      continue;
    }
    const t = line.trim();
    i++;
    if (!t) continue;
    if (SECTION.test(t)) out.push(`<h2>${esc(t)}</h2>`);
    else if (/^\d+[.)]\s/.test(t)) out.push(`<p class="item">${esc(t)}</p>`);
    else if (/^[-•*]\s+/.test(t)) out.push(`<p class="item">${esc(t.replace(/^[-•*]\s+/, ""))}</p>`);
    else out.push(`<p>${esc(t)}</p>`);
  }
  return out.join("\n");
}

function documentHtml(doc: ExportDoc, forWord: boolean): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const date = new Date().toLocaleDateString("ar-OM", { year: "numeric", month: "long", day: "numeric" });
  const font = forWord ? "'Simplified Arabic', 'Traditional Arabic', Arial" : "'Cairo', 'Simplified Arabic', Arial";
  const meta = (doc.meta ?? []).filter(([, v]) => v?.trim());
  const logo = (name: string) =>
    `<img src="${origin}/logo/${name}.png" width="78" height="78" style="width:78px;height:78px" alt="">`;
  return `<!doctype html>
<html lang="ar" dir="rtl"${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ""}>
<head>
<meta charset="utf-8">
<title>${esc(doc.title)}</title>
${forWord ? "" : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap">'}
<style>
  @page { size: A4; margin: 18mm 16mm; }
  html { color-scheme: light; background: #FFFFFF; }
  @media screen { body { max-width: 190mm; margin: 0 auto !important; padding: 24px 16px; } }
  body { background: #FFFFFF; font-family: ${font}; color: #0B1B3D; font-size: 13.5pt; line-height: 1.85; direction: rtl; margin: 0; }
  .head { width: 100%; border-bottom: 2.5pt solid #D4AF37; padding-bottom: 8pt; margin-bottom: 14pt; }
  .head td { vertical-align: middle; }
  .org { text-align: center; }
  .org .a { font-size: 14pt; font-weight: bold; }
  .org .c { font-size: 11.5pt; color: #3D4A63; }
  h1 { text-align: center; font-size: 19pt; margin: 6pt 0 2pt; }
  .sub { text-align: center; font-size: 13.5pt; font-weight: bold; color: #3D4A63; margin: 0 0 12pt; }
  .meta { border-collapse: collapse; margin: 0 auto 16pt; width: 100%; }
  .meta td { border: 0.75pt solid #D9DDE5; padding: 4pt 8pt; font-size: 12pt; }
  .meta td.k { background: #F4ECD0; font-weight: bold; width: 28%; }
  h2 { font-size: 14.5pt; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 0.75pt solid #D4AF37; }
  p { margin: 0 0 6pt; text-align: justify; }
  p.item { margin-right: 14pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 12pt; }
  th, td { border: 0.75pt solid #B8BFCC; padding: 4pt 6pt; font-size: 12pt; vertical-align: top; }
  th { background: #0B1B3D; color: #FFFFFF; }
  .sign { width: 100%; margin-top: 36pt; }
  .sign td { text-align: center; font-weight: bold; padding-top: 6pt; }
  .sign .line { display: block; margin-top: 28pt; font-weight: normal; color: #6B7280; }
  .foot { margin-top: 24pt; text-align: center; font-size: 10pt; color: #6B7280; }
</style>
</head>
<body>
<table class="head"><tr>
  <td style="width:90px">${logo("academy-logo")}</td>
  <td class="org"><div class="a">${ACADEMY}</div><div class="c">${esc(doc.conference ?? "المؤتمر العلمي الدولي الثالث")}</div></td>
  <td style="width:90px;text-align:left">${logo("conference-logo")}</td>
</tr></table>
<h1>${esc(doc.title)}</h1>
${doc.subtitle ? `<p class="sub">${esc(doc.subtitle)}</p>` : ""}
${meta.length ? `<table class="meta">${meta.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>` : ""}
${bodyHtml(doc)}
${
  doc.signatures?.length
    ? `<table class="sign"><tr>${doc.signatures
        .map((s) => `<td>${esc(s)}<span class="line">التوقيع: ............................</span></td>`)
        .join("")}</tr></table>`
    : ""
}
<p class="foot">صدر بتاريخ ${esc(date)}</p>
</body>
</html>`;
}

/** Opens the letterhead version in a new window and starts printing (Save as PDF). */
export function printReport(doc: ExportDoc): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(documentHtml(doc, false));
  w.document.close();
  const go = () => setTimeout(() => w.print(), 400);
  if (w.document.readyState === "complete") go();
  else w.addEventListener("load", go);
  return true;
}

/** Downloads the letterhead version as a Word document. */
export function downloadWord(doc: ExportDoc, filename: string) {
  const blob = new Blob(["﻿", documentHtml(doc, true)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
