import { clampInt, db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

// Must match MAX_ATTEMPTS in backend/claude_queue.py: rows at this count are skipped by the summary run.
const MAX_ATTEMPTS = 3;

/**
 * Articles waiting in pending_articles for the Claude summary run.
 * Returns a count per source plus the newest items (optionally for one source).
 * The article text is never sent: only title, source, link and dates.
 */
export async function GET(request) {
  return respond(async () => {
    const params = new URL(request.url).searchParams;
    const source = params.get("source");
    const limit = clampInt(params.get("limit"), 100, 1, 500);

    const [sources, totals, items] = await Promise.all([
      db().query(
        `SELECT source_label AS source, COUNT(*)::int AS count, MAX(published_at) AS newest
           FROM pending_articles GROUP BY source_label ORDER BY count DESC, source_label`
      ),
      db().query(
        `SELECT COUNT(*)::int AS waiting,
                COUNT(*) FILTER (WHERE attempts >= $1)::int AS stuck,
                COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
                MIN(published_at) AS oldest
           FROM pending_articles`,
        [MAX_ATTEMPTS]
      ),
      source && source !== "All"
        ? db().query(
            `SELECT id, title, source_label, source_url, published_at, attempts
               FROM pending_articles WHERE source_label = $1
              ORDER BY published_at DESC LIMIT $2`,
            [source, limit]
          )
        : db().query(
            `SELECT id, title, source_label, source_url, published_at, attempts
               FROM pending_articles ORDER BY published_at DESC LIMIT $1`,
            [limit]
          ),
    ]);

    return { ...totals.rows[0], sources: sources.rows, items: items.rows };
  });
}
