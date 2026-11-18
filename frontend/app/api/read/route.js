import { db, respond } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST {"ids": ["<uuid>", ...], "read": true|false}: marks items read (or back to unread).
export async function POST(request) {
  return respond(async () => {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string" && UUID.test(id)) : [];
    if (ids.length === 0 || ids.length > 500) return { updated: 0 };
    const { rowCount } = await db().query(
      body.read === false
        ? "UPDATE intel_feed SET read_at = NULL WHERE id = ANY($1::uuid[])"
        : "UPDATE intel_feed SET read_at = NOW() WHERE id = ANY($1::uuid[]) AND read_at IS NULL",
      [ids]
    );
    return { updated: rowCount };
  });
}
