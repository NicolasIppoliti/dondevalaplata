import type { MetadataRoute } from "next";
import { SHARE_FACT_IDS } from "@/lib/shareFacts";
import { SITE_URL } from "@/lib/site";
import { getFalloEjerciciosDescending, getPortalData } from "@/lib/sources";

/**
 * SEO: static sitemap listing every public, indexable route on this
 * 100%-build-time portal (DESIGN.md INVIOLABLE #4 -- no request-time API
 * here either, `next build` renders this once like every other route).
 * Dynamic segments (`/fallos/[ejercicio]`, `/compartir/[fact]`) are
 * enumerated from the SAME real data/id sources their own
 * `generateStaticParams` use, so this list can never drift out of sync
 * with what actually gets prerendered.
 *
 * Deliberately an explicit ALLOW-LIST (never "walk every folder under
 * app/") so a future parked/hidden route can never leak into search
 * results just by existing on disk -- there is currently no parked route
 * of its own (the titularidad registral field is a flag gating content
 * WITHIN `/adjudicaciones`, DESIGN.md 2026-07-10 entry, never a route),
 * but this stays the guard for whenever one exists.
 *
 * `lastModified` is deliberately omitted: this portal has no verified
 * per-route last-updated timestamp to publish, and fabricating one would
 * violate the same "never fabricate" doctrine that governs every other
 * figure on the site (DESIGN.md).
 */

const STATIC_ROUTES = [
  "",
  "/coparticipacion",
  "/gastos",
  "/gastos/cumplen",
  "/gastos/sueldos",
  "/adjudicaciones",
  "/transparencia",
  "/novedades",
  "/fallos",
  "/pedidos",
  "/fuentes",
  "/acerca",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const { fallos } = getPortalData();
  const ejercicios = getFalloEjerciciosDescending(fallos);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const falloEntries: MetadataRoute.Sitemap = ejercicios.map((ejercicio) => ({
    url: `${SITE_URL}/fallos/${ejercicio}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const compartirEntries: MetadataRoute.Sitemap = SHARE_FACT_IDS.map(
    (factId) => ({
      url: `${SITE_URL}/compartir/${factId}`,
      changeFrequency: "monthly",
      priority: 0.4,
    }),
  );

  return [...staticEntries, ...falloEntries, ...compartirEntries];
}
