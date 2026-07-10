import { describe, expect, it } from "vitest";
import { SITE_HOST, SITE_URL } from "@/lib/site";

/**
 * Fragua/SEO change: the portal's canonical domain moved from the
 * `vercel.app` preview URL to the real production subdomain
 * `dondevalaplata.fragua.dev` (a subdomain of Fragua's own brand, wired
 * via Vercel + Cloudflare DNS). Every absolute URL the portal builds (OG
 * images, share-card text, canonical tags, sitemap) reads from this ONE
 * constant, so switching it here is what re-points the whole site.
 */
describe("SITE_URL / SITE_HOST", () => {
  it("is the real production domain on the fragua.dev subdomain, not a vercel.app preview URL", () => {
    expect(SITE_URL).toBe("https://dondevalaplata.fragua.dev");
  });

  it("uses https", () => {
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });

  it("SITE_HOST is the bare host derived from SITE_URL, for UI copy that shows the domain without the protocol", () => {
    expect(SITE_HOST).toBe("dondevalaplata.fragua.dev");
  });
});
