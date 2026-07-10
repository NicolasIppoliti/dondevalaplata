import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * SEO: allow full indexing of this public transparency portal (there is
 * nothing to gate -- every route is already public data) and point
 * crawlers at the sitemap (app/sitemap.ts) so every real route gets
 * discovered directly, not only via internal link crawling.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
