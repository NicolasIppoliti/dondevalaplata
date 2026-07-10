import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SHARE_FACT_IDS } from "@/lib/shareFacts";
import { SITE_URL } from "@/lib/site";
import { getFalloEjerciciosDescending, getPortalData } from "@/lib/sources";

/**
 * SEO: static sitemap listing every public, indexable route. Built as an
 * explicit allow-list (never "every folder under app/") so a future
 * parked/hidden route (e.g. the titularidad registral field, DESIGN.md
 * 2026-07-10 entry -- currently a flag WITHIN /adjudicaciones, never a
 * route of its own) can never leak into search results just by existing
 * on disk. Dynamic segments are enumerated from the SAME data sources
 * their own `generateStaticParams` use, so this can never drift out of
 * sync with what `next build` actually prerenders.
 */
describe("app/sitemap.ts", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("uses the real production domain (fragua.dev), never the vercel.app preview URL", () => {
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
    }
  });

  it("includes every public static route", () => {
    const expectedPaths = [
      "",
      "/coparticipacion",
      "/gastos",
      "/gastos/cumplen",
      "/adjudicaciones",
      "/transparencia",
      "/novedades",
      "/fallos",
      "/pedidos",
      "/fuentes",
      "/acerca",
    ];
    for (const path of expectedPaths) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
  });

  it("includes every real fallos ejercicio, sourced from the same data generateStaticParams uses", () => {
    const { fallos } = getPortalData();
    const ejercicios = getFalloEjerciciosDescending(fallos);
    expect(ejercicios.length).toBeGreaterThan(0);
    for (const ejercicio of ejercicios) {
      expect(urls).toContain(`${SITE_URL}/fallos/${ejercicio}`);
    }
  });

  it("includes every real /compartir/[fact] id, sourced from the same SHARE_FACT_IDS generateStaticParams uses", () => {
    for (const factId of SHARE_FACT_IDS) {
      expect(urls).toContain(`${SITE_URL}/compartir/${factId}`);
    }
  });

  it("does not include any parked/hidden route, and has no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).not.toContain("titularidad");
    }
  });
});
