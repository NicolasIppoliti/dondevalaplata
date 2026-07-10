import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/gastos/sueldos/page";
import { formatArsHuman } from "@/lib/format";
import { personalTotals } from "@/lib/personal";
import { getPortalData } from "@/lib/sources";

/**
 * /gastos/sueldos -- "¿Cuánto se va en sueldos?", the fourth tab of the
 * Gastos door (`SectionTabs`, wired via `app/gastos/layout.tsx`'s nested-
 * layout inheritance). Same reconciled `data/gasto-partida.json` as
 * /gastos and /gastos/cumplen -- no new ETL artifact, see `lib/personal.ts`.
 */
describe("/gastos/sueldos page", () => {
  it("has a single accessible page heading naming the site (a11y heading hierarchy)", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("titles the section as a question, in a level-2 heading", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /cu[aá]nto se va en sueldos/i,
      }),
    ).toBeTruthy();
  });

  it("shows the real total gasto en personal devengado, human-rounded", () => {
    const { gastoPartida } = getPortalData();
    const totals = personalTotals(gastoPartida.jurisdicciones);
    const { container } = render(<Page />);
    expect(container.textContent).toContain(formatArsHuman(totals.devengadoArs));
  });

  it("shows the % personnel represents of the total gasto devengado", () => {
    const { gastoPartida } = getPortalData();
    const totals = personalTotals(gastoPartida.jurisdicciones);
    const pct = Math.round(
      (totals.devengadoArs / gastoPartida.reconciliation.totalDevengadoArs) * 100,
    );
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(new RegExp(`${pct}%`));
  });

  it("discloses the FOIA honesty caveat: itemized detail not public, cites Ordenanza 3638 Art. 11, links to /pedidos", () => {
    render(<Page />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/no es p[uú]blico/i);
    expect(text).toMatch(/Ordenanza 3638/);
    expect(text).toMatch(/Art\.?\s*11/);
    expect(
      screen.getByRole("link", { name: /pedí el detalle/i }),
    ).toBeTruthy();
  });

  it("shows every jurisdicción from data/gasto-partida.json as a compared área", () => {
    const { gastoPartida } = getPortalData();
    render(<Page />);
    for (const jurisdiccion of gastoPartida.jurisdicciones) {
      expect(screen.getAllByText(jurisdiccion.name).length).toBeGreaterThan(0);
    }
  });

  it("states the period the data covers, same source as /gastos", () => {
    const { gastoPartida } = getPortalData();
    const { container } = render(<Page />);
    expect(container.textContent).toContain(gastoPartida.period.label);
  });

  it("discloses that Q1 is ~a quarter of the year, so the % is a point-in-time execution ratio, not an annual average", () => {
    render(<Page />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/cuarta parte del año/i);
  });

  it("renders dual-link provenance (original + archived) with a sha256, standalone on this route (INVIOLABLE #2, reachable via a direct/shared link)", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /copia archivada/i })).toBeTruthy();
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/sha256/i);
  });

  it("never names any official, and never mentions titularidad (the parked feature must not leak in)", () => {
    render(<Page />);
    const text = (document.body.textContent ?? "").toLowerCase();
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/);
    expect(text).not.toMatch(/titularidad/);
  });
});
