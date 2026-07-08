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
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.length).toBe((coronelRosales?.points.length ?? 0) * 2);
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
