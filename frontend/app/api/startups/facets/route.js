import { db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

async function counts(column) {
  const { rows } = await db().query(
    `SELECT ${column} AS value, COUNT(*)::int AS count
       FROM startups_directory GROUP BY ${column} ORDER BY count DESC, value`
  );
  return rows;
}

export async function GET() {
  return respond(async () => ({
    countries: await counts("country"),
    industries: await counts("industry"),
  }));
}
