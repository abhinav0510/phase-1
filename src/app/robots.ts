import type { MetadataRoute } from "next";

/** Only the homepage is for search engines. Paths aren't listed, so /teamonly stays unlisted. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/$", disallow: "/" } };
}
