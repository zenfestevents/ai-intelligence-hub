/** @type {import('next').NextConfig} */
// The /api routes live in app/api and read Supabase directly, so the dashboard
// needs only DATABASE_URL (frontend/.env.local on your PC, a project variable on Vercel).
const nextConfig = {
  serverExternalPackages: ["pg"],
};

export default nextConfig;
