import { db, respond } from "@/lib/db";
import SOURCES from "@/lib/sources.json";

export const dynamic = "force-dynamic";

// The source list (from backend/feeds.py via export_sources.py) with live counts per source.
export async function GET() {
  return respond(async () => {
    const [{ rows: published }, { rows: waiting }] = await Promise.all([
      db().query(
        `SELECT source_label, COUNT(*)::int AS published,
                COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread,
                MAX(published_at) AS newest
           FROM intel_feed GROUP BY source_label`
      ),
      db().query(`SELECT source_label, COUNT(*)::int AS waiting FROM pending_articles GROUP BY source_label`),
    ]);
    // X labels come from the post author ("X @rowancheung"), so match without caring about case.
    const key = (label) => (label ?? "").toLowerCase();
    const pub = Object.fromEntries(published.map((r) => [key(r.source_label), r]));
    const wait = Object.fromEntries(waiting.map((r) => [key(r.source_label), r.waiting]));
    return SOURCES.map((s) => ({
      ...s,
      published: pub[key(s.label)]?.published ?? 0,
      unread: pub[key(s.label)]?.unread ?? 0,
      newest: pub[key(s.label)]?.newest ?? null,
      waiting: wait[key(s.label)] ?? 0,
    }));
  });
}
