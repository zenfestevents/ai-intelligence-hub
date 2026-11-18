import { NextResponse } from "next/server";
import { AUTH_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

// Every page and API route needs the password cookie, except the login page itself.
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const password = process.env.SITE_PASSWORD;
  if (!password) {
    // Fail closed: without a password set, nobody gets in.
    return new NextResponse("SITE_PASSWORD is not set for this deployment.", { status: 503 });
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
