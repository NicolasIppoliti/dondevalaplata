import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

/**
 * SEO: `buildPageMetadata` is the single place every route's metadata
 * (title/description/canonical/openGraph/twitter) is assembled, because
 * Next.js metadata merges only SHALLOWLY across layout/page segments -- a
 * page that sets its own `openGraph` key REPLACES the parent's `openGraph`
 * object wholesale rather than deep-merging individual fields (Next.js
 * "Metadata merging" docs). Testing the helper directly (rather than every
 * page.tsx call-site) is the actual unit of logic worth covering here --
 * each page.tsx is a one-line, declarative call into this tested builder.
 */
describe("buildPageMetadata", () => {
  it("builds an absolute canonical URL from SITE_URL + path", () => {
    const metadata = buildPageMetadata({
      title: "Coparticipación municipal",
      description: "desc",
      path: "/coparticipacion",
    });
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_URL}/coparticipacion`,
    );
  });

  it("builds the home canonical URL (empty path) as exactly SITE_URL, no trailing slash", () => {
    const metadata = buildPageMetadata({
      title: "¿Dónde va la plata? — Coronel Rosales",
      description: "desc",
      path: "",
      isHome: true,
    });
    expect(metadata.alternates?.canonical).toBe(SITE_URL);
  });

  it("keeps the raw page title on `title` (so the root layout's title.template still appends the site suffix once, not twice)", () => {
    const metadata = buildPageMetadata({
      title: "Coparticipación municipal",
      description: "desc",
      path: "/coparticipacion",
    });
    expect(metadata.title).toBe("Coparticipación municipal");
  });

  it("appends the site suffix explicitly to openGraph.title/twitter.title for non-home routes (those fields never go through title.template)", () => {
    const metadata = buildPageMetadata({
      title: "Coparticipación municipal",
      description: "desc",
      path: "/coparticipacion",
    });
    expect(metadata.openGraph?.title).toBe(
      "Coparticipación municipal — ¿Dónde va la plata? — Coronel Rosales",
    );
    expect(metadata.twitter?.title).toBe(
      "Coparticipación municipal — ¿Dónde va la plata? — Coronel Rosales",
    );
  });

  it("does NOT double-append the site suffix for the home page (isHome: true)", () => {
    const metadata = buildPageMetadata({
      title: "¿Dónde va la plata? — Coronel Rosales",
      description: "desc",
      path: "",
      isHome: true,
    });
    expect(metadata.openGraph?.title).toBe(
      "¿Dónde va la plata? — Coronel Rosales",
    );
  });

  it("sets openGraph.url to the same absolute canonical URL", () => {
    const metadata = buildPageMetadata({
      title: "Fuentes y metodología",
      description: "desc",
      path: "/fuentes",
    });
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/fuentes`);
  });

  it("sets a summary_large_image Twitter card so shares render the site's OG image at full size", () => {
    const metadata = buildPageMetadata({
      title: "Fuentes y metodología",
      description: "desc",
      path: "/fuentes",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("propagates the same description to openGraph and twitter", () => {
    const metadata = buildPageMetadata({
      title: "Pedidos de acceso a la información",
      description: "Generá tu pedido.",
      path: "/pedidos",
    });
    expect(metadata.description).toBe("Generá tu pedido.");
    expect(metadata.openGraph?.description).toBe("Generá tu pedido.");
    expect(metadata.twitter?.description).toBe("Generá tu pedido.");
  });
});
