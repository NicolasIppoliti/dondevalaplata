import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Page from "@/app/coparticipacion/page";
import { formatPeriodEsAr } from "@/lib/format";
import { computeCoparticipacionTrend } from "@/lib/insight";
import { getPortalData } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/** Opens the "Ver todos los números" Drawer so its content (aria-hidden
 * while closed) becomes reachable via role-based queries. */
function openDetailDrawer() {
  fireEvent.click(
    screen.getAllByRole("button", { name: /Ver todos los números/ })[0],
  );
}

describe("/coparticipacion page", () => {
  it("shows the IPC series id and base month next to the adjusted figures", () => {
    const { coparticipacion } = getPortalData();
    const { container } = render(<Page />);
    expect(container.textContent).toContain(coparticipacion.ipcSeriesId);
    expect(container.textContent).toContain(
      formatPeriodEsAr(coparticipacion.baseMonth),
    );
  });

  it("labels the secondary series explicitly as nominal, distinct from the adjusted one", () => {
    const { container } = render(<Page />);
    expect(container.textContent?.toLowerCase()).toContain("nominal");
    expect(container.textContent?.toLowerCase()).toContain("ajustad");
  });

  it("states the freshness/lag disclosure", () => {
    const { coparticipacion } = getPortalData();
    const { container } = render(<Page />);
    expect(container.textContent).toContain(coparticipacion.lagNote);
  });

  it("never renders a fabricated $0 row for a month that has not been published yet", () => {
    const { container } = render(<Page />);
    const cells = Array.from(container.querySelectorAll("td"));
    const zeroCell = cells.find((cell) => cell.textContent?.trim() === "$ 0");
    expect(zeroCell).toBeUndefined();
  });

  it("discloses that the headline figure sums every CSV concept, not just Coparticipación Bruta", () => {
    // W2 (verify report): the ETL sums ~28 distinct `concepto` line items
    // per municipio-month into one headline figure -- documented in code
    // (aggregate_by_period's docstring) but never disclosed in the UI.
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toContain("coparticipación bruta");
    expect(text).toMatch(/suma de (todos|los)/);
  });

  it("renders exactly the periods present in the data, with no padded rows", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (series) => series.municipioId === "06182",
    );
    render(<Page />);
    openDetailDrawer();
    // 3 tables share this row shape: per-cápita (H3a), adjusted (real), and
    // nominal -- each with one row per period, no padded/fabricated rows.
    const tableCount = screen.getAllByRole("table").length;
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.length).toBe(
      (coronelRosales?.points.length ?? 0) * tableCount,
    );
  });
});

describe("/coparticipacion — inverted hierarchy (conclusion first, big chart, rest in a drawer)", () => {
  it("leads with the DATA-DRIVEN conclusion sentence from lib/insight.ts, never a hardcoded claim", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
    );
    const expectedTrend = computeCoparticipacionTrend(
      coronelRosales?.points ?? [],
    );
    render(<Page />);
    expect(screen.getByText(expectedTrend.message)).toBeTruthy();
  });

  it('collapses every table and methodology note behind a "Ver todos los números" drawer, closed by default', () => {
    render(<Page />);
    expect(screen.queryByRole("dialog")).toBeNull();
    openDetailDrawer();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("provides a Real/Nominal segmented control on the hero chart (supersedes the old separate toggle-chart)", () => {
    render(<Page />);
    const realButton = screen.getAllByRole("button", { name: "Real" })[0];
    const nominalButton = screen.getAllByRole("button", { name: "Nominal" })[0];
    expect(realButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(nominalButton);
    expect(nominalButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("states the neighbor-comparison integrity caveat (no verifiable per-capita source in this build)", () => {
    render(<Page />);
    openDetailDrawer();
    expect(
      screen.getByText(
        /Cifras absolutas, no ajustadas por población.*Bahía Blanca tiene varias veces más habitantes que Coronel Rosales/,
      ),
    ).toBeTruthy();
  });

  it("never silently truncates municipios on mobile: the comparison table always lists all 4 in the DOM", () => {
    const { coparticipacion } = getPortalData();
    render(<Page />);
    openDetailDrawer();
    const columnHeaders = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    for (const series of coparticipacion.series) {
      expect(columnHeaders).toContain(series.municipio);
    }
  });

  it("explains what 'real' means, in plain language, next to the chart", () => {
    render(<Page />);
    expect(screen.getByText(/ya descontada la inflación/i)).toBeTruthy();
  });

  it("shows the ColorLegend near the interactive chart's colored figures", () => {
    render(<Page />);
    expect(
      screen.getByRole("region", { name: /c[oó]mo leer los colores/i }),
    ).toBeTruthy();
  });
});

describe("/coparticipacion — per-cápita neighbor comparison (feature H3a)", () => {
  it("shows a per-cápita comparison citing Censo 2022 (INDEC) as the population source", () => {
    render(<Page />);
    openDetailDrawer();
    expect(
      screen.getByRole("heading", { name: "Comparación por habitante" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Coparticipación por habitante \(Censo 2022, INDEC\)/),
    ).toBeTruthy();
  });

  it("lists all 4 municipios in the per-cápita table, never silently truncating one", () => {
    const { coparticipacion } = getPortalData();
    render(<Page />);
    openDetailDrawer();
    const perCapitaHeading = screen.getByRole("heading", {
      name: "Comparación por habitante",
    });
    const perCapitaSection = perCapitaHeading.closest("section");
    expect(perCapitaSection).toBeTruthy();
    const columnHeaders = Array.from(
      perCapitaSection?.querySelectorAll("th[scope=col]") ?? [],
    ).map((th) => th.textContent);
    for (const series of coparticipacion.series) {
      expect(columnHeaders).toContain(series.municipio);
    }
  });

  it("keeps the original absolute-pesos comparison available, now pointing to the per-cápita section", () => {
    render(<Page />);
    openDetailDrawer();
    expect(
      screen.getByText(
        /Cifras absolutas, no ajustadas por población.*Bahía Blanca tiene varias veces más habitantes que Coronel Rosales/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Ver la comparación por habitante arriba/),
    ).toBeTruthy();
  });

  it("Coronel Rosales's per-cápita figure equals its real coparticipación divided by its Censo 2022 population", () => {
    const { coparticipacion, poblacionCenso } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (series) => series.municipioId === "06182",
    );
    const poblacion = poblacionCenso.municipios.find(
      (m) => m.municipioId === "06182",
    )?.poblacion;
    const lastPoint = coronelRosales?.points[coronelRosales.points.length - 1];
    const expectedPerCapita = Math.round(
      (lastPoint?.realArs ?? 0) / (poblacion ?? 1),
    );
    render(<Page />);
    openDetailDrawer();
    const grouped = expectedPerCapita
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    expect(screen.getAllByText(`$ ${grouped}`).length).toBeGreaterThan(0);
  });
});

describe("/coparticipacion — share card button (feature H3b)", () => {
  it("offers a Compartir button near the hero chart for the coparticipación fact", () => {
    render(<Page />);
    expect(
      screen.getByRole("button", { name: /compartir/i }),
    ).toBeTruthy();
  });
});
