import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { FALLO_FIELD_LABELS } from "@/components/fallos/FalloCard";
import { formatArsHuman, splitArsUnit } from "@/lib/format";
import { computeCoparticipacionTrend } from "@/lib/insight";
import {
  getFalloEjerciciosDescending,
  getPortalData,
  resolveSourceRef,
  selectFallosPreview,
  shortHash,
} from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * Slice 2: home becomes a real dashboard hero (DESIGN.md v2 "Home = afiche"
 * evolved with count-up, a sparkline of the real series, and dual-link +
 * sha256 provenance for the headline figure -- previously missing on
 * home, an INVIOLABLE #2 gap this slice closes). rebrand.test.tsx keeps
 * owning the pre-existing brand/mobile-fold invariants unchanged.
 */
describe("Home — hero dashboard (slice 2)", () => {
  it("shows the headline figure's exact value immediately, split into amount + unit for the card scale (no fake count-up)", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    const latest = coronelRosales?.points.at(-1);
    const { amount, unit } = splitArsUnit(
      formatArsHuman(Math.round(latest!.realArs)),
    );
    render(<Home />);
    expect(screen.getByText(amount)).toBeTruthy();
    if (unit) {
      expect(screen.getByText(unit)).toBeTruthy();
    }
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

  it("gives the coparticipación dashboard card a one-line plain-language description alongside its question", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Cuánto llegó este mes?",
    });
    expect(
      within(region).getByText(/coparticipaci[oó]n mensual/i),
    ).toBeTruthy();
  });

  it("leads with the data-driven trend conclusion sentence (lib/insight.ts, same source as /coparticipacion)", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    // Re-derive the same trend the page should now show, using the shared
    // lib/insight.ts helper -- never a hardcoded home-page string. Fidelity
    // slice F2 repeats this same data-driven sentence in BOTH the hero card
    // and the coparticipación dashboard section below it (matching Mockup
    // A), so this now allows multiple matches instead of exactly one.
    const trend = computeCoparticipacionTrend(coronelRosales?.points ?? []);
    render(<Home />);
    expect(screen.getAllByText(trend.message).length).toBeGreaterThan(0);
  });
});

/**
 * Fidelity slice F2 (Mockup A): the landing below the hero is now a DENSE
 * DASHBOARD -- a coparticipación chart card, a real fallos grid, and the
 * ASAP transparencia gauge -- composed entirely from REUSED, already-tested
 * app components (`InteractiveCoparticipacionChart`, `FalloCard`,
 * `TransparenciaGauge`), never a table-of-contents of plain accordion rows.
 * Each dashboard section keeps the question heading (Fraunces) + a "ver
 * todo →" link to its full route, per DESIGN.md's updated home-landing
 * description. Only "¿De dónde salen los datos?" stays a simple row/link
 * (see rebrand.test.tsx's "fuentes" row test).
 */
describe("Home — dashboard landing (fidelity slice F2, Mockup A)", () => {
  it("renders the real InteractiveCoparticipacionChart (Real/Nominal toggle) inside the coparticipación section, not a static placeholder", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Cuánto llegó este mes?",
    });
    expect(
      within(region).getByRole("group", {
        name: "Elegir cómo ver los montos",
      }),
    ).toBeTruthy();
  });

  it("links the coparticipación section to /coparticipacion via a 'ver todo' link", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Cuánto llegó este mes?",
    });
    const link = within(region).getByRole("link", { name: /ver todo/i });
    expect(link).toHaveProperty(
      "href",
      expect.stringContaining("/coparticipacion"),
    );
  });

  it("shows real FalloCard fichas for every ejercicio in the preview selection -- never hidden behind a year index", () => {
    const { fallos } = getPortalData();
    const preview = selectFallosPreview(fallos);
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué dicen las multas del Tribunal de Cuentas?",
    });
    for (const record of preview) {
      expect(region.textContent).toContain(record.official);
      expect(region.textContent).toContain(record.falloId);
    }
  });

  it("keeps the identical fallo field-set on every home preview card (neutrality invariant)", () => {
    const { fallos } = getPortalData();
    const preview = selectFallosPreview(fallos);
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué dicen las multas del Tribunal de Cuentas?",
    });
    for (const label of Object.values(FALLO_FIELD_LABELS)) {
      expect(within(region).getAllByText(label)).toHaveLength(preview.length);
    }
  });

  it("shows dual-link + sha256 provenance on every home fallos preview card", () => {
    const { fallos } = getPortalData();
    const preview = selectFallosPreview(fallos);
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué dicen las multas del Tribunal de Cuentas?",
    });
    expect(
      within(region).getAllByRole("link", { name: /fallo oficial/i }),
    ).toHaveLength(preview.length);
    expect(
      within(region).getAllByRole("link", { name: /copia archivada/i }),
    ).toHaveLength(preview.length);
    expect(within(region).getAllByText(/sha256/)).toHaveLength(
      preview.length,
    );
  });

  it("links the fallos section to /fallos via a 'ver todo' link", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué dicen las multas del Tribunal de Cuentas?",
    });
    const link = within(region).getByRole("link", { name: /ver todo/i });
    expect(link).toHaveProperty("href", expect.stringContaining("/fallos"));
  });

  it("shows the 81/100 gauge, its category and the correct ASAP attribution (civil association, not a ministry; fiscal not integral)", () => {
    const { transparencia } = getPortalData();
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué tan transparente es el municipio?",
    });
    expect(region.textContent).toContain(
      `${transparencia.total} / ${transparencia.max}`,
    );
    expect(within(region).getByText(transparencia.category)).toBeTruthy();
    const text = region.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/asociaci[oó]n civil/);
    expect(text).toMatch(/no (es |)un ministerio/);
    expect(text).toMatch(/transparencia fiscal/);
    expect(text).not.toContain("capital humano");
  });

  it("shows a compact 'qué falta' hint in the transparencia preview card", () => {
    const { transparencia } = getPortalData();
    const gapCount = transparencia.dimensions.filter(
      (d) => d.got < d.max,
    ).length;
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué tan transparente es el municipio?",
    });
    const text = region.textContent ?? "";
    expect(text.toLowerCase()).toMatch(/qu[eé] falta/);
    expect(text).toMatch(new RegExp(String(gapCount)));
  });

  it("shows dual-link + sha256 provenance for the transparencia score in the home preview", () => {
    const { transparencia, manifest } = getPortalData();
    const primaryRef = resolveSourceRef(transparencia.sourceRefs[0], manifest);
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué tan transparente es el municipio?",
    });
    const original = within(region).getByRole("link", {
      name: /fuente original/i,
    });
    expect(original).toHaveProperty("href", primaryRef.sourceUrl);
    const archived = within(region).getByRole("link", {
      name: /copia archivada/i,
    });
    expect(archived).toHaveProperty("href", primaryRef.archivedUrl);
    expect(
      within(region).getByText(new RegExp(shortHash(primaryRef.sha256))),
    ).toBeTruthy();
  });

  it("links the transparencia section to /transparencia via a 'ver todo' link", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: "¿Qué tan transparente es el municipio?",
    });
    const link = within(region).getByRole("link", { name: /ver todo/i });
    expect(link).toHaveProperty(
      "href",
      expect.stringContaining("/transparencia"),
    );
  });
});

/**
 * Feature G1: a compact deuda-counter widget on the home page, factual and
 * neutral, linking through to the full /transparencia cadence dashboard.
 */
describe("Home — compact deuda counter (feature G1)", () => {
  it("renders the compact deuda counter with the last figure, no ordenanza prose", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: /no actualiza su stock de deuda/i,
    });
    const text = region.textContent ?? "";
    expect(text.toLowerCase()).toMatch(/no actualiza/);
    expect(text).toMatch(/46\.876\.896/);
    expect(text).not.toMatch(/Ordenanza 3638/);
  });

  it("is framed factually, never a judgment of a person or gestión (scoped to the widget itself)", () => {
    render(<Home />);
    const region = screen.getByRole("region", {
      name: /no actualiza su stock de deuda/i,
    });
    const text = region.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de|corrupci[oó]n/i);
  });
});

describe("Home — gasto por partida row (feature G2)", () => {
  it("links to /gastos with the whole row tappable, min tap target", () => {
    render(<Home />);
    const link = screen.getByRole("link", {
      name: /en qu[eé] gast[oó] el municipio/i,
    });
    expect(link.getAttribute("href")).toBe("/gastos");
  });
});

describe("Home — adjudicaciones row (feature G3)", () => {
  it("links to /adjudicaciones with the whole row tappable, real counts in the description", () => {
    const { adjudicaciones, proveedores } = getPortalData();
    render(<Home />);
    const link = screen.getByRole("link", {
      name: /a qui[eé]n le compr[oó] el municipio/i,
    });
    expect(link.getAttribute("href")).toBe("/adjudicaciones");
    expect(link.textContent).toContain(String(adjudicaciones.records.length));
    expect(link.textContent).toContain(String(proveedores.proveedores.length));
  });
});

/**
 * Fidelity slice F3 (Mockup C, mobile only): the hero card leads on small
 * screens via CSS `order` (never DOM reshuffling), a compact mobile lede
 * line + "independiente" pill replace the full editorial column, and a new
 * grouped-rows list (icon + question + value + chevron) teases the three
 * main routes right below the hero. Every value reuses data already
 * exercised by the F1/F2 describe blocks above -- these tests only check
 * the NEW mobile-only markup exists, is correctly linked, and never
 * duplicates a text node the F1/F2 tests already assert is singular.
 */
describe("Home — mobile hero + quick-action rows (fidelity slice F3, Mockup C)", () => {
  it("shows the compact mobile lede sentence that stands in for the full editorial column", () => {
    render(<Home />);
    expect(
      screen.getByText(
        "Portal vecinal independiente que sigue la plata pública de Coronel Rosales.",
      ),
    ).toBeTruthy();
  });

  it("shows an 'independiente' pill inside the hero card", () => {
    render(<Home />);
    const hero = within(
      screen.getByRole("region", { name: "Cifra destacada del mes" }),
    );
    expect(hero.getByText("independiente")).toBeTruthy();
  });

  it("renders a mobile quick-action rows list linking to coparticipación, fallos and transparencia, each with a chevron", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Accesos rápidos" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveProperty(
      "href",
      expect.stringContaining("/coparticipacion"),
    );
    expect(links[1]).toHaveProperty(
      "href",
      expect.stringContaining("/fallos"),
    );
    expect(links[2]).toHaveProperty(
      "href",
      expect.stringContaining("/transparencia"),
    );
    expect(within(nav).getAllByText("›")).toHaveLength(3);
  });

  it("shows the coparticipación row's headline value matching the hero card's own figure, with a single '$' (amount already carries its own sign)", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    const latest = coronelRosales?.points.at(-1);
    const { amount } = splitArsUnit(formatArsHuman(Math.round(latest!.realArs)));
    expect(amount.startsWith("$")).toBe(true);
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Accesos rápidos" });
    expect(within(nav).getByText(`${amount} M`)).toBeTruthy();
    expect(within(nav).queryByText(`$ ${amount} M`)).toBeNull();
  });

  it("shows the fallos row's ejercicio count, matching getFalloEjerciciosDescending -- never a hardcoded number", () => {
    const { fallos } = getPortalData();
    const ejercicioCount = getFalloEjerciciosDescending(fallos).length;
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Accesos rápidos" });
    expect(within(nav).getByText(String(ejercicioCount))).toBeTruthy();
    expect(within(nav).getByText("ejercicios")).toBeTruthy();
  });

  it("shows the transparencia row's score fraction, compact (no spaces, distinct from the full-page '81 / 100' rendering)", () => {
    const { transparencia } = getPortalData();
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Accesos rápidos" });
    expect(
      within(nav).getByText(`${transparencia.total}/${transparencia.max}`),
    ).toBeTruthy();
  });

  it("marks every row icon and chevron as decorative (aria-hidden)", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Accesos rápidos" });
    const svgs = nav.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
    for (const svg of svgs) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
