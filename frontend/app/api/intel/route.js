import { clampInt, db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

const FILTERS = {
  category: "primary_category",
  industry: "industry_tag",
  country: "country_of_origin",
  source: "source_label",
};

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
    values.push(clampInt(params.get("limit"), 50, 1, 200));
    const { rows } = await db().query(
      `SELECT id, title, entity_name, primary_category, industry_tag, summary,
              exact_source_quote, source_url, country_of_origin, published_at
         FROM intel_feed
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY published_at DESC
        LIMIT $${values.length}`,
      values
    );
    return rows;
  });
}
