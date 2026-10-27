// Lists the PDFs dropped into public/papers/track-N/ (paper-S.pdf, cv-S.pdf)
// so the sessions API can link them without editing the database.
// Runs before every build (see "build" in package.json).
import { readdirSync, writeFileSync, existsSync } from "node:fs";

const root = "public/papers";
const files = [];
if (existsSync(root)) {
  for (const dir of readdirSync(root).sort()) {
    if (!/^track-\d+$/.test(dir)) continue;
    for (const f of readdirSync(`${root}/${dir}`).sort()) {
      if (/^(paper|cv)-\d+\.pdf$/.test(f)) files.push(`${dir}/${f}`);
    }
  }
}
writeFileSync("src/lib/papers-manifest.json", JSON.stringify(files, null, 1) + "\n");
console.log(`papers manifest: ${files.length} files`);
