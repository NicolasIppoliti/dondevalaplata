import { describe, expect, it } from "vitest";
import { SHARE_FACT_IDS } from "@/lib/shareFacts";
import * as historiaRoute from "@/app/compartir/[fact]/historia/route";
import * as whatsappRoute from "@/app/compartir/[fact]/whatsapp/route";

/**
 * Feature H4 (shareable PNG images): both Route Handlers must be statically
 * generated -- exactly once per known fact id, at `next build` time -- same
 * `generateStaticParams` + `dynamicParams = false` doctrine as the sibling
 * `opengraph-image.tsx` and `app/compartir/[fact]/page.tsx` (this portal is
 * 100% build-time, DESIGN.md INVIOLABLE #4). This is what makes "image
 * routes build for each fact+format" true: a route not covered here would
 * either 404 (dynamicParams=false, not in the static list) or -- worse --
 * silently fall back to on-demand rendering.
 */
describe("share image Route Handlers (feature H4)", () => {
  it.each([
    ["whatsapp", whatsappRoute],
    ["historia", historiaRoute],
  ] as const)(
    "%s route statically generates exactly the 3 known fact ids and rejects unknown ones",
    (_label, route) => {
      expect(route.dynamicParams).toBe(false);
      expect(route.generateStaticParams()).toEqual(
        SHARE_FACT_IDS.map((fact) => ({ fact })),
      );
    },
  );
});
