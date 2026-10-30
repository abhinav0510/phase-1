const isDev = process.env.NODE_ENV === "development";
// The Docker build sets this. Vercel and `next start` use the normal output.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");

// Next's page bootstrap uses inline scripts and the UI uses inline styles, so those stay
// allowed. Browsers may only talk to this site and Supabase, and only Drive may be framed.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}${isDev ? " ws:" : ""}`.trim(),
  "frame-src https://drive.google.com https://docs.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: standalone ? "standalone" : undefined,
  // nginx compresses responses in production.
  compress: !standalone,
  // The site's only images are three small logos, so the image optimiser adds nothing
  // but CPU use and attack surface.
  images: { unoptimized: true },
  // The browser tests build into their own folder so they can run beside a dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
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
