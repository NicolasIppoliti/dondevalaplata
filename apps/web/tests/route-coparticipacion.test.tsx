import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/coparticipacion/page";
import { formatPeriodEsAr } from "@/lib/format";
import { getPortalData } from "@/lib/sources";

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
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.length).toBe((coronelRosales?.points.length ?? 0) * 2);
  });
});
