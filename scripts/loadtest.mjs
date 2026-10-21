// Load test for the SQAPS conference portal (see README → اختبار التحمل).
// Usage:
//   node scripts/loadtest.mjs browse  <baseUrl> [users=20] [seconds=60]  visitors browsing sessions
//   node scripts/loadtest.mjs saves   <baseUrl> [users=20]               concurrent report saves
//   node scripts/loadtest.mjs ai      <baseUrl> [users=20]               concurrent المفكّر chats/tools (DeepSeek)
//   node scripts/loadtest.mjs aiheavy <baseUrl> [users=20]               concurrent full reports / minutes
// Writes go to session 49 (not shown on the site) — delete its rows afterwards:
//   DELETE FROM session_reports WHERE "trackId"=49; DELETE FROM track_sessions WHERE "trackId"=49;
// Preview deployments (*-sqps3.vercel.app) are reached with the project's
// automation bypass key, read at runtime through the logged-in Vercel CLI
// token and never printed.
import fs from "node:fs";

const [mode, base, usersArg, secondsArg] = process.argv.slice(2);
const USERS = Number(usersArg ?? 20);
const TEST_TRACK = 49; // not shown on the site (sessions 1..8); cleaned up afterwards

async function bypassHeader() {
  if (!base.includes("-sqps3.vercel.app")) return {};
  const token = JSON.parse(
    fs.readFileSync(`${process.env.APPDATA}/com.vercel.cli/Data/auth.json`, "utf8"),
  ).token;
  const p = await (
    await fetch(
      "https://api.vercel.com/v9/projects/prj_70VnnV9xLO8GAiFcgqjJF07inZlu?teamId=team_6veYPC7RcBMPBKJ61xTJzatE",
      { headers: { Authorization: `Bearer ${token}` } },
    )
  ).json();
  const secret = Object.keys(p.protectionBypass ?? {})[0];
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}
const BYPASS = await bypassHeader();

const stats = new Map(); // name -> {lat:[], errors:{}}
async function hit(name, path, init = {}, timeoutMs = 60000) {
  const t0 = performance.now();
  let status = "ERR";
  let body = null;
  try {
    const r = await fetch(base + path, {
      ...init,
      headers: { ...BYPASS, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = r.status;
    body = await r.text();
  } catch (e) {
    status = e.name === "TimeoutError" ? "TIMEOUT" : "ERR";
  }
  const ms = performance.now() - t0;
  const s = stats.get(name) ?? { lat: [], codes: {} };
  s.lat.push(ms);
  s.codes[status] = (s.codes[status] ?? 0) + 1;
  stats.set(name, s);
  return { status, body, ms };
}

function report(title) {
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((a.length * p) / 100))];
  console.log(`\n=== ${title} ===`);
  console.log("endpoint".padEnd(34), "reqs".padStart(5), "ok%".padStart(6), "p50ms".padStart(7), "p95ms".padStart(7), "maxms".padStart(7), " codes");
  for (const [name, s] of stats) {
    const lat = [...s.lat].sort((a, b) => a - b);
    const ok = Object.entries(s.codes).filter(([c]) => c === "200").reduce((n, [, v]) => n + v, 0);
    console.log(
      name.padEnd(34),
      String(lat.length).padStart(5),
      ((ok / lat.length) * 100).toFixed(0).padStart(5) + "%",
      pct(lat, 50).toFixed(0).padStart(7),
      pct(lat, 95).toFixed(0).padStart(7),
      lat[lat.length - 1].toFixed(0).padStart(7),
      " " + JSON.stringify(s.codes),
    );
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = { "Content-Type": "application/json" };

if (mode === "browse") {
  // 20 visitors browsing sessions at the same time, for N seconds.
  const until = Date.now() + Number(secondsArg ?? 60) * 1000;
  await Promise.all(
    Array.from({ length: USERS }, async (_, u) => {
      await hit("GET / (page)", "/");
      while (Date.now() < until) {
        const t = 1 + ((u + Math.floor(Math.random() * 8)) % 8);
        await Promise.all([
          hit("GET /api/site-content", "/api/site-content"),
          hit("GET /api/sessions/[t]", `/api/sessions/${t}`),
          hit("GET report chair", `/api/sessions/${t}/report?role=chair`),
          hit("GET report secretary", `/api/sessions/${t}/report?role=secretary`),
          hit("GET /api/questions", `/api/questions?trackId=${t}`),
        ]);
        if (Math.random() < 0.15) await hit("GET /qn (page)", `/qn?s=${t}`);
        await sleep(800 + Math.random() * 1200); // think time, like the site's polling
      }
    }),
  );
  report(`browse: ${USERS} users`);
}

if (mode === "saves") {
  // A) 20 people each saving a DIFFERENT report at the same moment.
  const keys = Array.from({ length: USERS }, (_, i) => ({
    role: i % 2 ? "secretary" : "chair",
    paperSlot: Math.floor(i / 2), // 0 = general
  }));
  const contentA = (k) => `loadtest-A ${k.role} slot ${k.paperSlot} ${"نص ".repeat(400)}`;
  await Promise.all(
    keys.map((k) =>
      hit("PUT report (distinct)", `/api/sessions/${TEST_TRACK}/report`, {
        method: "PUT",
        headers: json,
        body: JSON.stringify({ content: contentA(k), editedBy: "loadtest", ...k }),
      }),
    ),
  );
  let mismatch = 0;
  await Promise.all(
    keys.map(async (k) => {
      const q = `role=${k.role}${k.paperSlot ? `&paperSlot=${k.paperSlot}` : ""}`;
      const r = await hit("GET report (verify)", `/api/sessions/${TEST_TRACK}/report?${q}`);
      if (JSON.parse(r.body ?? "{}").content !== contentA(k)) mismatch++;
    }),
  );
  console.log(`A) distinct reports: ${keys.length} saved, ${mismatch} read back wrong`);

  // B) 20 people saving the SAME report (general secretary report) at once — 3 rounds.
  for (let round = 1; round <= 3; round++) {
    const sent = Array.from({ length: USERS }, (_, i) => `loadtest-B r${round} writer ${i}`);
    await Promise.all(
      sent.map((content) =>
        hit("PUT report (same key)", `/api/sessions/${TEST_TRACK}/report`, {
          method: "PUT",
          headers: json,
          body: JSON.stringify({ content, editedBy: "loadtest", paperSlot: 0, role: "secretary" }),
        }),
      ),
    );
    const r = await hit("GET report (verify)", `/api/sessions/${TEST_TRACK}/report?role=secretary`);
    const got = JSON.parse(r.body ?? "{}").content;
    console.log(`B) round ${round}: final content is one of the 20 sent → ${sent.includes(got)}`);
  }
  const all = await hit("GET all reports", `/api/sessions/${TEST_TRACK}/report?paperSlot=all`);
  const rows = JSON.parse(all.body ?? "{}").reports ?? [];
  const dup = rows.length - new Set(rows.map((x) => `${x.role}|${x.paperSlot}`)).size;
  console.log(`rows for test track: ${rows.length} (expected ${keys.length}), duplicate keys: ${dup}`);
  report(`saves: ${USERS} concurrent writers`);
}

if (mode === "ai") {
  // 20 people asking المفكّر at the same moment: chat + analysis tools that call DeepSeek.
  const prompts = [
    "ما أبرز القضايا المشتركة بين أوراق هذه الجلسة؟",
    "اقترح ثلاث توصيات عملية من أوراق الجلسة.",
    "لخّص النقاط الرئيسية للجلسة في خمسة أسطر.",
    "ما نقاط القوة في منهجيات الأوراق؟",
  ];
  const providers = {};
  await Promise.all(
    Array.from({ length: USERS }, async (_, i) => {
      const trackId = 2 + (i % 7);
      let r;
      if (i % 2 === 0) {
        r = await hit(
          "POST /api/ai/agent (chat)",
          "/api/ai/agent",
          {
            method: "POST",
            headers: json,
            body: JSON.stringify({
              trackId,
              mode: "report",
              role: i % 4 === 0 ? "secretary" : "chair",
              messages: [{ role: "user", content: prompts[i % prompts.length] }],
            }),
          },
          90000,
        );
      } else {
        r = await hit(
          "POST /api/ai/analyze (AI)",
          "/api/ai/analyze",
          {
            method: "POST",
            headers: json,
            body: JSON.stringify({ trackId, action: i % 3 ? "discussion" : "compare", notes: "" }),
          },
          130000,
        );
      }
      try {
        const p = JSON.parse(r.body).provider ?? "none";
        providers[p] = (providers[p] ?? 0) + 1;
      } catch {
        providers["unparsed"] = (providers["unparsed"] ?? 0) + 1;
      }
    }),
  );
  console.log("providers:", JSON.stringify(providers));
  report(`ai: ${USERS} concurrent المفكّر requests`);
}

if (mode === "aiheavy") {
  // Worst case: everyone asks for the full official report / minutes at once.
  const providers = {};
  await Promise.all(
    Array.from({ length: USERS }, async (_, i) => {
      const r = await hit(
        i % 2 ? "POST analyze minutes" : "POST analyze report",
        "/api/ai/analyze",
        { method: "POST", headers: json, body: JSON.stringify({ trackId: 2 + (i % 7), action: i % 2 ? "minutes" : "report", notes: "" }) },
        130000,
      );
      try {
        const j = JSON.parse(r.body);
        const p = (j.provider ?? "none") + (j.suggestedReport ? "" : " (no report)");
        providers[p] = (providers[p] ?? 0) + 1;
      } catch {
        providers.unparsed = (providers.unparsed ?? 0) + 1;
      }
    }),
  );
  console.log("providers:", JSON.stringify(providers));
  report(`aiheavy: ${USERS} concurrent full reports`);
}
