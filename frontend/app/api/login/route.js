import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, safeEqual, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST (form): checks the password and sets the session cookie.
export async function POST(request) {
  const expected = process.env.SITE_PASSWORD;
  const form = await request.formData();
  const given = String(form.get("password") ?? "");

  if (!expected || !safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(AUTH_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}

// DELETE: signs out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
