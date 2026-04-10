/**
 * Run after Supabase project is active:
 *   node scripts/seed-competitions.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing env vars: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Check current state ─────────────────────────────────────────
const { data: existing, error: fetchErr } = await client
  .from("competitions")
  .select("id, name, is_active");

if (fetchErr) {
  console.error("❌ Could not reach database:", fetchErr.message);
  process.exit(1);
}

console.log(
  "📋 Current competitions:",
  existing.length ? JSON.stringify(existing, null, 2) : "(empty)",
);

// ── 2. Upsert World Cup 2026 if missing or inactive ───────────────
const wc2026 = existing.find(
  (c) =>
    c.name === "FIFA World Cup 2026" ||
    c.id === "00000000-0000-0000-0000-000000000001",
);

if (wc2026) {
  if (!wc2026.is_active) {
    const { error } = await client
      .from("competitions")
      .update({ is_active: true })
      .eq("id", wc2026.id);
    if (error) console.error("❌ Failed to activate:", error.message);
    else
      console.log("✅ Activated existing 'FIFA World Cup 2026' (was inactive)");
  } else {
    console.log(
      "✅ 'FIFA World Cup 2026' already exists and is active — no changes needed.",
    );
  }
  process.exit(0);
}

// Not found — insert it
const { error: insertErr } = await client.from("competitions").insert({
  id: "00000000-0000-0000-0000-000000000001",
  name: "FIFA World Cup 2026",
  short_name: "WC 2026",
  type: "world_cup",
  season: "2026",
  starts_at: "2026-06-11T19:00:00Z",
  ends_at: "2026-07-19T20:00:00Z",
  is_active: true,
  logo_url: null,
});

if (insertErr) {
  console.error("❌ Insert failed:", insertErr.message);
  process.exit(1);
} else {
  console.log("✅ 'FIFA World Cup 2026' inserted successfully.");
}
