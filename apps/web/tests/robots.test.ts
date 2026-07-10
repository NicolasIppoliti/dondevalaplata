import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { SITE_URL } from "@/lib/site";

/**
 * SEO: allow full indexing of this public transparency portal and point
 * crawlers at the sitemap (app/sitemap.ts), on the real production domain.
 */
describe("app/robots.ts", () => {
  it("allows indexing for all user agents", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.userAgent).toBe("*");
    expect(rules?.allow).toBe("/");
  });

  it("points to the sitemap on the real production domain", () => {
    const result = robots();
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
