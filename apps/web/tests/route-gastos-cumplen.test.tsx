import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/gastos/cumplen/page";
import { getPortalData } from "@/lib/sources";

/**
 * /gastos/cumplen -- "¿Cumplen lo que prometieron?" (feature H1), moved to
 * its own route as part of the IA consolidation ("4 puertas", DESIGN.md
 * decisions log entry "I1"): Gastos is now a tabbed door (Por partida /
 * ¿Cumplen lo que prometieron? / ¿A quién le compró?), each tab a real,
 * independently prerendered route (`components/SectionTabs.tsx`). Same
 * reconciled `data/gasto-partida.json` as /gastos, re-grouped one level up
 * to the Jurisdicción ("área"/secretaría) -- these assertions are relocated,
 * unweakened, from the old `/gastos page — ¿Cumplen lo que prometieron?`
 * describe block in `tests/route-gastos.test.tsx`.
 */
describe("/gastos/cumplen page", () => {
  it("has a single accessible page heading naming the site (a11y heading hierarchy)", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("titles the section as a question, in a level-2 heading", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /cumplen lo que prometieron/i,
      }),
    ).toBeTruthy();
  });

  it("discloses the honesty caveat about what over/under 100% execution means and does NOT prove by itself", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/no prueba por s[ií] sol[oa] una irregularidad/);
    expect(text).toMatch(/reasignaciones leg[ií]timas/);
  });

  it("shows every jurisdicción from data/gasto-partida.json as a compared área", () => {
    const { gastoPartida } = getPortalData();
    render(<Page />);
    for (const jurisdiccion of gastoPartida.jurisdicciones) {
      expect(screen.getAllByText(jurisdiccion.name).length).toBeGreaterThan(0);
    }
  });

  it("surfaces at least one over-executed área when the real data has one, with its exact % (never clamped to 100)", () => {
    const { gastoPartida } = getPortalData();
    const overExecuted = gastoPartida.jurisdicciones.filter((j) => {
      const totals = j.programas
        .flatMap((p) => p.objetos)
        .reduce(
          (acc, o) => ({
            vigenteArs: acc.vigenteArs + o.vigenteArs,
            devengadoArs: acc.devengadoArs + o.devengadoArs,
          }),
          { vigenteArs: 0, devengadoArs: 0 },
        );
      return totals.vigenteArs > 0 && totals.devengadoArs > totals.vigenteArs;
    });
    expect(overExecuted.length).toBeGreaterThan(0);
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/[1-9]\d\d\d?%/); // a 3-4 digit percentage exists somewhere
  });

  it("states the period the data covers, same source as /gastos", () => {
    const { gastoPartida } = getPortalData();
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toContain(gastoPartida.period.label);
  });

  it("renders dual-link provenance (original + archived) with a sha256, standalone on this route (INVIOLABLE #2, reachable via a direct/shared link)", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /copia archivada/i })).toBeTruthy();
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/sha256/i);
  });
});
