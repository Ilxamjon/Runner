#!/usr/bin/env node
/**
 * Simple load smoke script against Supabase REST (anon key).
 * Usage:
 *   node scripts/load-smoke.mjs
 * Env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, CONCURRENCY=10, REQUESTS=50
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const concurrency = Number(process.env.CONCURRENCY ?? 10);
const total = Number(process.env.REQUESTS ?? 50);

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

async function hit() {
  const started = Date.now();
  const res = await fetch(`${url}/rest/v1/regions?select=id&limit=5`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  return { ok: res.ok, ms: Date.now() - started, status: res.status };
}

async function run() {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < total) {
      const n = i++;
      results[n] = await hit();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const ok = results.filter((r) => r.ok).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  console.log(JSON.stringify({ total, ok, fail: total - ok, avg_ms: avg, p50_ms: p50, p95_ms: p95 }, null, 2));
  if (ok < total) process.exit(2);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
