// Read-only full backup of every table in the database to one JSON file.
// Nothing is changed or deleted.
//
//   node scripts/ops/backup-db.mjs [output-folder]
//
// Default folder: ../sqaps-backups (next to the project, outside git).
// Needs DATABASE_URL (.env / .env.local, or `vercel env pull .env.local`).
// paper_files.data is already base64 text and is saved as-is; any bytea
// column would be saved as { base64 }.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadEnv, ROOT } from "./env.mjs";

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — run `vercel env pull .env.local` first.");
  process.exit(1);
}

const outDir = path.resolve(process.argv[2] || path.join(ROOT, "..", "sqaps-backups"));
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const file = path.join(outDir, `backup-${stamp}.json`);

const db = new PrismaClient();
try {
  const tables = await db.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1",
  );
  const out = { at: new Date().toISOString(), tables: {} };
  for (const { tablename } of tables) {
    out.tables[tablename] = await db.$queryRawUnsafe(`SELECT * FROM "${tablename}"`);
    console.log(tablename.padEnd(18), out.tables[tablename].length);
  }
  writeFileSync(
    file,
    JSON.stringify(out, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v instanceof Uint8Array) return { base64: Buffer.from(v).toString("base64") };
      // Buffer.toJSON runs before the replacer: { type: "Buffer", data: [...] }
      if (v && v.type === "Buffer" && Array.isArray(v.data)) return { base64: Buffer.from(v.data).toString("base64") };
      return v;
    }),
  );
  console.log(`saved ${file} (${(statSync(file).size / 2 ** 20).toFixed(1)} MB)`);
} finally {
  await db.$disconnect();
}
