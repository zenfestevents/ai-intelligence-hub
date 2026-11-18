import { db, respond } from "@/lib/db";
import SOURCES from "@/lib/sources.json";

export const dynamic = "force-dynamic";

// Feeds that are switched on in backend/feeds.py (the X accounts are counted separately).
const SOURCES_ENABLED = SOURCES.filter((s) => s.enabled && s.group !== "X accounts").length;
const X_ACCOUNTS = SOURCES.filter((s) => s.group === "X accounts").length;

export async function GET() {
  return respond(async () => {
    const { rows } = await db().query(`
      SELECT
        (SELECT COUNT(*)::int FROM intel_feed WHERE read_at IS NULL) AS unread_total,
        (SELECT COUNT(*)::int FROM intel_feed WHERE read_at IS NOT NULL) AS read_total,
        (SELECT COUNT(*)::int FROM intel_feed WHERE created_at >= NOW() - INTERVAL '24 hours') AS verified_last_24h,
        (SELECT COUNT(*)::int FROM intel_feed) AS verified_total,
        (SELECT COUNT(*)::int FROM rejected_items) AS rejected_total,
        (SELECT COUNT(*)::int FROM startups_directory) AS startups_total,
        (SELECT COUNT(*)::int FROM pending_articles) AS waiting_total,
        GREATEST(
          (SELECT MAX(created_at) FROM intel_feed),
          (SELECT MAX(created_at) FROM rejected_items),
          (SELECT MAX(created_at) FROM pending_articles)
        ) AS last_update_at
    `);
    return { ...rows[0], sources_enabled: SOURCES_ENABLED, x_accounts: X_ACCOUNTS };
  });
}
