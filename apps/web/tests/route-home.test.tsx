import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { formatArsHuman } from "@/lib/format";
import { computeCoparticipacionTrend } from "@/lib/insight";
import { getPortalData, resolveSourceRef, shortHash } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * Slice 2: home becomes a real dashboard hero (DESIGN.md v2 "Home = afiche"
 * evolved with count-up, a sparkline of the real series, and dual-link +
 * sha256 provenance for the headline figure -- previously missing on
 * home, an INVIOLABLE #2 gap this slice closes). rebrand.test.tsx keeps
 * owning the pre-existing brand/mobile-fold invariants unchanged.
 */
describe("Home — hero dashboard (slice 2)", () => {
  it("shows the headline figure's final formatted value immediately (CountUp never flashes a bare 0)", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    const latest = coronelRosales?.points.at(-1);
    render(<Home />);
    expect(screen.getByText(formatArsHuman(latest!.realArs))).toBeTruthy();
  });

  it("renders a decorative sparkline of the real series next to the headline figure", () => {
    const { container } = render(<Home />);
    expect(container.querySelector("polyline")).not.toBeNull();
  });

  it("shows dual-link + sha256 provenance for the headline figure (source + copia archivada + short sha256)", () => {
    const { coparticipacion, manifest } = getPortalData();
    const primaryRef = resolveSourceRef(coparticipacion.sourceRefs[0], manifest);
    render(<Home />);
    // Scope to the hero region -- the "¿De dónde salen los datos?" nav row
    // ALSO mentions "copia archivada" in its one-line description, which
    // would otherwise ambiguously match the same accessible-name query.
    const hero = within(
      screen.getByRole("region", { name: "Cifra destacada del mes" }),
    );
    const original = hero.getByRole("link", { name: /fuente original/i });
    expect(original).toHaveProperty("href", primaryRef.sourceUrl);
    const archived = hero.getByRole("link", { name: /copia archivada/i });
    expect(archived).toHaveProperty("href", primaryRef.archivedUrl);
    expect(
      hero.getByText(new RegExp(shortHash(primaryRef.sha256))),
    ).toBeTruthy();
  });

  it("shows the ColorLegend near the colored variation chip", () => {
    render(<Home />);
    expect(
      screen.getByRole("region", { name: /c[oó]mo leer los colores/i }),
    ).toBeTruthy();
  });

  it("gives each tappable section row a one-line plain-language description alongside its question", () => {
    render(<Home />);
    const link = screen.getByRole("link", {
      name: /¿Cuánto llegó este mes\?/,
    });
    expect(
      within(link).getByText(/coparticipaci[oó]n mensual/i),
    ).toBeTruthy();
  });

  it("leads with the data-driven trend conclusion sentence in the hero card (lib/insight.ts, same source as /coparticipacion)", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    // Re-derive the same trend the hero card should now show, using the
    // shared lib/insight.ts helper -- never a hardcoded home-page string.
    const trend = computeCoparticipacionTrend(coronelRosales?.points ?? []);
    render(<Home />);
    expect(screen.getByText(trend.message)).toBeTruthy();
  });
});
