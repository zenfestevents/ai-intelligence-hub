import { clampInt, db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

const FILTERS = {
  category: "primary_category",
  industry: "industry_tag",
  country: "country_of_origin",
  source: "source_label",
};

// ?read=0 (default) unread only, newest published first
// ?read=1 read only, most recently read first
// ?read=all everything
export async function GET(request) {
  return respond(async () => {
    const params = new URL(request.url).searchParams;
    const where = [];
    const values = [];
    for (const [param, column] of Object.entries(FILTERS)) {
      const value = params.get(param);
      if (value && value !== "All") {
        values.push(value);
        where.push(`${column} = $${values.length}`);
      }
    }
    const read = params.get("read") ?? "0";
    if (read === "0") where.push("read_at IS NULL");
    if (read === "1") where.push("read_at IS NOT NULL");
    const order = read === "1" ? "read_at DESC" : "published_at DESC";

    values.push(clampInt(params.get("limit"), 50, 1, 1000));
    const limitIdx = values.length;
    values.push(clampInt(params.get("offset"), 0, 0, 100000));
    const offsetIdx = values.length;

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const filterValues = values.slice(0, limitIdx - 1);
    const [{ rows }, { rows: countRows }] = await Promise.all([
      db().query(
        `SELECT id, title, entity_name, primary_category, industry_tag, summary,
                exact_source_quote, source_url, country_of_origin, source_label, published_at, read_at
           FROM intel_feed ${whereSql}
          ORDER BY ${order}, id
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        values
      ),
      db().query(`SELECT COUNT(*)::int AS total FROM intel_feed ${whereSql}`, filterValues),
    ]);
    return { items: rows, total: countRows[0].total };
  });
}
