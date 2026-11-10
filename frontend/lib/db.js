import { Pool } from "pg";

let pool;

/** Shared Postgres connection pool (server side only). */
export function db() {
  if (!pool) {
    let url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // Serverless functions open many short connections. Supabase's transaction
    // pooler (port 6543) is built for that; the session pooler (5432) is not.
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    pool = new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Runs a handler and turns any failure into a JSON 500 without leaking details. */
export async function respond(handler) {
  try {
    return Response.json(await handler(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("API error:", err.message);
    return Response.json({ error: "Database unavailable" }, { status: 500 });
  }
}
