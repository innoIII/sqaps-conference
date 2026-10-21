import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/admin/usage — admin only (src/proxy.ts guards /api/admin/*).
 *
 * Usage meters for the admin dashboard, against the free-plan limits:
 *   - Database storage: always available (read straight from Postgres).
 *   - Neon compute hours + network transfer: needs NEON_API_KEY
 *     (+ NEON_PROJECT_ID when the key sees more than one project).
 *   - Vercel "Functions Storage": needs VERCEL_API_TOKEN (team sqps3).
 * Missing keys are reported as `available: false`, never as errors.
 */

const GB = 1024 ** 3;
const LIMITS = {
  dbStorage: 1 * GB, // Neon Free: 1 GB per project
  computeHours: 100, // Neon Free: 100 CU-hours per month
  transfer: 5 * GB, // Neon Free: 5 GB public network transfer per month
  functions: 10 * GB, // Vercel Hobby: 10 GB Functions Storage
};

// Not secrets — the project's public ids on Vercel.
const VERCEL_TEAM = "team_6veYPC7RcBMPBKJ61xTJzatE";
const VERCEL_PROJECT = "prj_70VnnV9xLO8GAiFcgqjJF07inZlu";

let cached: { at: number; body: unknown } | null = null;

async function dbUsage() {
  const [size] = await db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`;
  const tables = await db.$queryRaw<{ name: string; bytes: bigint; rows: bigint }[]>`
    SELECT relname AS name, pg_total_relation_size(relid) AS bytes, n_live_tup AS rows
    FROM pg_stat_user_tables WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(relid) DESC`;
  return {
    bytes: Number(size.bytes),
    limit: LIMITS.dbStorage,
    tables: tables.map((t) => ({ name: t.name, bytes: Number(t.bytes), rows: Number(t.rows) })),
  };
}

async function neonUsage() {
  const key = process.env.NEON_API_KEY;
  if (!key) return { available: false as const };
  const api = (path: string) =>
    fetch(`https://console.neon.tech/api/v2${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Neon ${r.status}`))));
  let projectId = process.env.NEON_PROJECT_ID;
  if (!projectId) {
    const list = await api("/projects");
    if (list.projects?.length !== 1) throw new Error("set NEON_PROJECT_ID");
    projectId = list.projects[0].id as string;
  }
  const { project: p } = await api(`/projects/${projectId}`);
  return {
    available: true as const,
    computeHours: (Number(p.compute_time_seconds) || 0) / 3600,
    computeLimit: LIMITS.computeHours,
    transferBytes: Number(p.data_transfer_bytes) || 0,
    transferLimit: LIMITS.transfer,
    periodStart: p.consumption_period_start ?? null,
    periodEnd: p.consumption_period_end ?? null,
  };
}

async function vercelUsage() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { available: false as const };
  const api = (path: string) =>
    fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${VERCEL_TEAM}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Vercel ${r.status}`))));
  const { deployments = [] } = await api(`/v6/deployments?projectId=${VERCEL_PROJECT}&limit=100`);
  // Each deployment keeps its own copy of its function bundles; count each digest once per deployment.
  const sizes = await Promise.all(
    deployments.map(async (d: { uid: string }) => {
      const b = await api(`/v11/deployments/${d.uid}/builds`).catch(() => ({ builds: [] }));
      const seen = new Map<string, number>();
      for (const build of b.builds ?? [])
        for (const o of build.output ?? []) if (o.type === "lambda") seen.set(o.digest, o.size);
      return [...seen.values()].reduce((a, v) => a + v, 0);
    }),
  );
  return {
    available: true as const,
    bytes: sizes.reduce((a, v) => a + v, 0),
    limit: LIMITS.functions,
    deployments: deployments.length,
  };
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.has("refresh");
  if (!force && cached && Date.now() - cached.at < 60_000) {
    return NextResponse.json(cached.body, { headers: { "Cache-Control": "no-store" } });
  }
  const settle = async <T,>(p: Promise<T>) => {
    try {
      return await p;
    } catch (e) {
      return { available: false as const, error: e instanceof Error ? e.message : "error" };
    }
  };
  const [database, neon, vercel] = await Promise.all([settle(dbUsage()), settle(neonUsage()), settle(vercelUsage())]);
  const body = { database, neon, vercel, at: new Date().toISOString() };
  cached = { at: Date.now(), body };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
