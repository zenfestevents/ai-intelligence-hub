import { clampInt, db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return respond(async () => {
    const params = new URL(request.url).searchParams;
    const where = [];
    const values = [];
    for (const column of ["country", "industry"]) {
      const value = params.get(column);
      if (value && value !== "All") {
        values.push(value);
        where.push(`${column} = $${values.length}`);
      }
    }
    const q = (params.get("q") || "").trim();
    if (q) {
      values.push(`%${q}%`);
      where.push(`(company_name ILIKE $${values.length} OR use_case_description ILIKE $${values.length})`);
    }
    values.push(clampInt(params.get("limit"), 60, 1, 500));
    values.push(clampInt(params.get("offset"), 0, 0, 1000000));
    const { rows } = await db().query(
      `SELECT id, company_name, website_url, country, industry, batch_or_funding,
              use_case_description, source_reference_url
         FROM startups_directory
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY company_name
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return rows;
  });
}
