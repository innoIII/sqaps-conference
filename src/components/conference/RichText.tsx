import { Fragment, type ReactNode } from "react";

/**
 * Minimal renderer for the AI assistant's replies: paragraphs (line breaks
 * kept), **bold**, # headings, --- rules, and Markdown pipe tables (used by
 * the peer-review table).
 * Deliberately tiny — no Markdown dependency, no HTML injection.
 */

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const isRow = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|");
const cells = (line: string) => line.trim().slice(1, -1).split("|").map((c) => c.trim());
const isDivider = (line: string) => /^\|?\s*:?-{2,}/.test(line.trim().replace(/^\|/, "").trim());

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isRow(lines[i])) {
      const rows: string[][] = [];
      while (i < lines.length && isRow(lines[i])) {
        if (!isDivider(lines[i])) rows.push(cells(lines[i]));
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={`t${i}`} className="my-2 overflow-x-auto rounded-lg ring-1 ring-[#E2E5EC]">
          <table className="w-full min-w-[420px] border-collapse text-right text-xs">
            <thead className="bg-[#0B1B3D] text-white">
              <tr>
                {head.map((c, k) => (
                  <th key={k} className="px-2.5 py-2 font-bold">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k} className="border-t border-[#E2E5EC] odd:bg-[#F5F6F8]/60">
                  {r.map((c, j) => (
                    <td key={j} className={`px-2.5 py-1.5 align-top ${j === 1 ? "whitespace-nowrap font-bold tabular-nums" : ""}`}>
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(lines[i].trim());
    if (heading) {
      blocks.push(
        <p key={`h${i}`} className="pt-1 font-extrabold text-[#0B1B3D]">
          {inline(heading[1])}
        </p>,
      );
      i++;
      continue;
    }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim())) {
      blocks.push(<hr key={`r${i}`} className="my-2 border-[#E2E5EC]" />);
      i++;
      continue;
    }
    const para: string[] = [];
    const isBreak = (l: string) => isRow(l) || /^#{1,6}\s/.test(l.trim()) || /^(-{3,}|_{3,}|\*{3,})$/.test(l.trim());
    while (i < lines.length && !isBreak(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={`p${i}`} className="whitespace-pre-wrap">
        {inline(para.join("\n"))}
      </p>,
    );
  }
  return <>{blocks}</>;
}
