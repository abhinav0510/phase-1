/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase types are introspected at build time; keep server-only envs server-only.
  experimental: {
    // nothing exotic yet
  },
};

export default nextConfig;
