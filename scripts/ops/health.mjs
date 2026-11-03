// Read-only health check of the live conference site. Writes nothing.
//
//   node scripts/ops/health.mjs
//
// Page status + response time, and (when ADMIN_USER / ADMIN_PASSWORD are set
// in .env.local or the environment) database size, Neon compute hours and the
// row count of every table from /api/admin/usage.
import { loadEnv } from "./env.mjs";

loadEnv();
const SITE = process.env.SITE_URL || "https://sqaps-conference.vercel.app";
const PAGES = ["/", "/qn", "/map", "/api/site-content", "/api/sessions/2", "/api/questions"];

console.log(`== ${new Date().toLocaleString("en-GB")}  ${SITE}`);
let bad = 0;
for (const p of PAGES) {
  const t0 = performance.now();
  try {
    const r = await fetch(`${SITE}${p}${p.includes("?") ? "&" : "?"}h=${Date.now()}`, { signal: AbortSignal.timeout(30000) });
    const s = ((performance.now() - t0) / 1000).toFixed(2);
    if (!r.ok || Number(s) > 5) bad++;
    console.log(`${r.ok && Number(s) <= 5 ? "OK  " : "BAD "} ${r.status} ${s}s  ${p}`);
  } catch (e) {
    bad++;
    console.log(`BAD  ---  ${p}  ${e.message}`);
  }
}

const { ADMIN_USER, ADMIN_PASSWORD } = process.env;
if (ADMIN_USER && ADMIN_PASSWORD) {
  const auth = "Basic " + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
  try {
    const r = await fetch(`${SITE}/api/admin/usage`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 401 ? " (ADMIN_USER / ADMIN_PASSWORD wrong)" : ""}`);
    const d = await r.json();
    const db = d.database;
    if (!db || db.available === false || !Array.isArray(db.tables)) throw new Error(`database: ${db?.error ?? "no data"}`);
    console.log(`DB ${(db.bytes / 2 ** 20).toFixed(1)} MB / 1024 MB`);
    console.log("rows:", Object.fromEntries(db.tables.map((t) => [t.name, Number(t.rows)])));
    const n = d.neon ?? {};
    if (n.available) {
      console.log(`Neon CU-h ${n.computeHours.toFixed(2)} / 100 | transfer ${(n.transferBytes / 2 ** 20).toFixed(1)} MB`);
    } else {
      console.log(`(Neon meters unavailable: ${n.error ?? "NEON_API_KEY not set on Vercel"})`);
    }
  } catch (e) {
    bad++;
    console.log("BAD  usage:", e.message);
  }
} else {
  console.log("(ADMIN_USER / ADMIN_PASSWORD not set — skipped DB usage)");
}
process.exit(bad ? 1 : 0);
