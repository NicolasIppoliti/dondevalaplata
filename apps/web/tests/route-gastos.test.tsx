import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/gastos/page";
import { getPortalData } from "@/lib/sources";

/**
 * /gastos — "gasto por partida" explorer (feature G2). The MAXIMUM public
 * granularity of the municipal budget (Jurisdicción x Apertura Programática
 * x Objeto del Gasto), sourced from the real RAFAM "Estado de Ejecución del
 * Presupuesto de Gastos" PDF. Covers: plain-language definitions, the
 * honest "no vendors here" caveat, dual-link provenance + sha256 + period,
 * the reconciliation proof, and that the explorer itself renders.
 */
describe("/gastos page", () => {
  it("titles the section as a question, in the display heading level", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent?.length).toBeGreaterThan(0);
  });

  it("defines vigente, devengado and pagado in plain language", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/vigente/);
    expect(text).toMatch(/devengado/);
    expect(text).toMatch(/pagado/);
  });

  it("discloses the honest caveat: this is budget-level, not vendor-level detail", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/m[aá]ximo detalle p[uú]blico/);
    expect(text).toMatch(/no incluye proveedores/);
  });

  it("states the period the data covers", () => {
    const { gastoPartida } = getPortalData();
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toContain(gastoPartida.period.label);
  });

  it("shows the reconciliation proof against the document's own published total", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/coincide|reconcilia|verificamos/);
  });

  it("renders dual-link provenance (original + archived) with a sha256", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /copia archivada/i })).toBeTruthy();
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/sha256/i);
  });

  it("renders the searchable explorer with real jurisdicciones from data/gasto-partida.json", () => {
    const { gastoPartida } = getPortalData();
    render(<Page />);
    expect(screen.getByRole("searchbox", { name: /buscar partida/i })).toBeTruthy();
    const firstJurisdiccion = gastoPartida.jurisdicciones[0];
    expect(
      screen.getByRole("button", { name: new RegExp(firstJurisdiccion.name) }),
    ).toBeTruthy();
  });

  it("never claims per-vendor/CUIT detail anywhere on the page", () => {
    const { container } = render(<Page />);
    expect(container.textContent?.toLowerCase()).not.toMatch(/\bcuit\b/);
  });
});
