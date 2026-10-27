/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase types are introspected at build time; keep server-only envs server-only.
  experimental: {
    // Keep recently-visited routes in the client Router Cache so switching back to
    // a tab renders instantly from memory instead of re-fetching. Fresh data still
    // comes from the server-side data cache (see lib/data/founder.ts) and its tag
    // invalidation, so this only governs how long a navigated-away tab stays warm.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
