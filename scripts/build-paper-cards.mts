/**
 * Builds the AI analysis card for every paper: docs/cards/track-N/paper-S.json
 *
 *   node scripts/build-paper-cards.mts            # build missing / outdated cards
 *   node scripts/build-paper-cards.mts --force    # rebuild all
 *   node scripts/build-paper-cards.mts --track 2  # one track only
 *
 * Source per paper: docs/papers/track-N/paper-S.md (full paper) when present,
 * otherwise docs/cv/track-N/cv-S.md (booklet page with the abstract).
 * A card built from the abstract is rebuilt automatically once the full paper
 * text is added. Needs DEEPSEEK_API_KEY (read from .env).
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { REVIEWER_PERSONA, CARD_INSTRUCTIONS } from "../src/lib/ai-prompts.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS = path.join(ROOT, "docs");
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY_TRACK = args.includes("--track") ? Number(args[args.indexOf("--track") + 1]) : null;

function loadEnvKey(): string {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const env = readFileSync(path.join(ROOT, ".env"), "utf8");
  const m = env.match(/^DEEPSEEK_API_KEY=["']?([^"'\r\n]+)/m);
  if (!m) throw new Error("DEEPSEEK_API_KEY not found in environment or .env");
  return m[1];
}
const API_KEY = loadEnvKey();
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

interface Job {
  track: number;
  slot: number;
  source: "full" | "abstract";
  file: string;
  out: string;
}

const meta = (md: string, label: string) =>
  md.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`))?.[1]?.trim() ?? "";
const body = (md: string) => {
  const i = md.indexOf("## النص");
  return (i >= 0 ? md.slice(i + "## النص".length) : md).trim();
};

async function collectJobs(): Promise<Job[]> {
  const jobs: Job[] = [];
  const cvRoot = path.join(DOCS, "cv");
  for (const dir of await readdir(cvRoot)) {
    const t = /^track-(\d+)$/.exec(dir);
    if (!t) continue;
    const track = Number(t[1]);
    if (ONLY_TRACK && track !== ONLY_TRACK) continue;
    for (const f of await readdir(path.join(cvRoot, dir))) {
      const s = /^cv-(\d+)\.md$/.exec(f);
      if (!s) continue;
      const slot = Number(s[1]);
      const paper = path.join(DOCS, "papers", dir, `paper-${slot}.md`);
      const full = existsSync(paper);
      jobs.push({
        track,
        slot,
        source: full ? "full" : "abstract",
        file: full ? paper : path.join(cvRoot, dir, f),
        out: path.join(DOCS, "cards", dir, `paper-${slot}.json`),
      });
    }
  }
  return jobs.sort((a, b) => a.track - b.track || a.slot - b.slot);
}

async function needsBuild(job: Job): Promise<boolean> {
  if (FORCE || !existsSync(job.out)) return true;
  try {
    const card = JSON.parse(await readFile(job.out, "utf8"));
    return card.source !== job.source; // abstract card → rebuild once the full paper exists
  } catch {
    return true;
  }
}

async function build(job: Job) {
  const md = await readFile(job.file, "utf8");
  const user = [
    `محور الجلسة: ${meta(md, "المحور")}`,
    `عنوان الورقة: ${md.match(/^# (.+)$/m)?.[1] ?? ""}`,
    `الباحث/الباحثون: ${meta(md, "الباحث/الباحثون")}`,
    job.source === "abstract"
      ? "(المتاح: صفحة الملخص من كتيب المؤتمر فقط — لا تستنتج ما ليس فيها)"
      : "(النص الكامل للورقة)",
    "",
    body(md).slice(0, 60000),
  ].join("\n");

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: `${REVIEWER_PERSONA}\n\n${CARD_INSTRUCTIONS}` },
        { role: "user", content: user },
      ],
      max_tokens: 2500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const card = JSON.parse(data.choices[0].message.content);
  card.source = job.source;
  await mkdir(path.dirname(job.out), { recursive: true });
  await writeFile(job.out, JSON.stringify(card, null, 2) + "\n", "utf8");
}

const jobs = await collectJobs();
const todo: Job[] = [];
for (const j of jobs) if (await needsBuild(j)) todo.push(j);
console.log(`${jobs.length} papers, ${todo.length} card(s) to build`);

let failed = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const label = `track ${job.track} / paper ${job.slot} (${job.source})`;
      try {
        await build(job);
        console.log(`✓ ${label}`);
      } catch (e) {
        failed++;
        console.log(`✗ ${label}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }),
);
if (failed) process.exitCode = 1;
