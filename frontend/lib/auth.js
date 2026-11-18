// Simple one-password login for the dashboard.
// The password lives only in the SITE_PASSWORD environment variable (Vercel project setting,
// frontend/.env.local on your PC). The cookie holds an HMAC of it, never the password itself,
// so changing SITE_PASSWORD logs every browser out.

export const AUTH_COOKIE = "radar_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 90; // stay signed in for 90 days

const enc = new TextEncoder();

/** The cookie value that proves the visitor knew SITE_PASSWORD. Works in Edge and Node. */
export async function sessionToken(password) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("radar-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in time that doesn't depend on where they differ. */
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
