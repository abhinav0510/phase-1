/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The browser tests build into their own folder so they can run beside a dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
    // Logo uploads go through a server action; the app caps files at 2 MB, so
    // allow a little headroom over the 1 MB default for the multipart body.
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
