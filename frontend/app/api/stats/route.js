import { db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

// Number of enabled sources in backend/feeds.py. Update when that list changes.
// (Run `python check_feeds.py` or count ENABLED_FEEDS; the 8 X accounts are not included.)
const SOURCES_ENABLED = 74;
// The poller runs every 30 minutes; treat it as active if it wrote anything recently.
const ACTIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function GET() {
  return respond(async () => {
    const { rows } = await db().query(`
      SELECT
        (SELECT COUNT(*)::int FROM intel_feed WHERE created_at >= NOW() - INTERVAL '24 hours') AS verified_last_24h,
        (SELECT COUNT(*)::int FROM intel_feed) AS verified_total,
        (SELECT COUNT(*)::int FROM rejected_items) AS rejected_total,
        (SELECT COUNT(*)::int FROM startups_directory) AS startups_total,
        GREATEST(
          (SELECT MAX(created_at) FROM intel_feed),
          (SELECT MAX(created_at) FROM rejected_items),
          (SELECT MAX(created_at) FROM pending_articles)
        ) AS last_poll_at
    `);
    const stats = rows[0];
    return {
      ...stats,
      sources_enabled: SOURCES_ENABLED,
      polling_active: Boolean(stats.last_poll_at) && Date.now() - new Date(stats.last_poll_at).getTime() < ACTIVE_WINDOW_MS,
    };
  });
}
