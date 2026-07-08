import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PresupuestoEjecucionSection } from "@/components/presupuesto-ejecucion/PresupuestoEjecucionSection";
import type { AreaEjecucion } from "@/lib/presupuestoEjecucion";

/**
 * Feature H1: "¿Cumplen lo que prometieron?" -- Presupuesto vs. Ejecución
 * por área. This component is the ONLY consumer of `lib/presupuestoEjecucion.ts`
 * and stays a plain server component (no "use client", no interaction) --
 * a static, build-time-derived list, same "cero JS" doctrine already used
 * by `CadenceDashboard`/`app/transparencia/page.tsx`'s progress bars.
 */

const PERIOD_LABEL = "1er trimestre 2026";

const AREAS: AreaEjecucion[] = [
  {
    code: "1110190000",
    name: "Servicios de la Deuda",
    vigenteArs: 94531129.77,
    devengadoArs: 1659690148.2,
    executionFraction: 17.559542,
    gapArs: 1565159018.43,
  },
  {
    code: "1110122000",
    name: "Secretaria de Desarrollo Produc. y Gestión Academ.",
    vigenteArs: 1212942879.6,
    devengadoArs: 406373687.27,
    executionFraction: 0.335,
    gapArs: -806569192.33,
  },
  {
    code: "1110200000",
    name: "H.C.D.",
    vigenteArs: 1887632995.19,
    devengadoArs: 352698712.92,
    executionFraction: 0.1869,
    gapArs: -1534934282.27,
  },
];

/**
 * The área name "Servicios de la Deuda" legitimately appears TWICE in the
 * rendered output (the notable-case highlight prose AND its own list row),
 * so a plain `getByText` is ambiguous by design -- this scopes to the
 * actual `<li>` row by name, never the highlight paragraph.
 */
function getRowByName(name: string): HTMLElement {
  const rows = screen.getAllByRole("listitem");
  const row = rows.find((li) => li.textContent?.includes(name));
  if (!row) throw new Error(`no row found for área "${name}"`);
  return row;
}

describe("PresupuestoEjecucionSection", () => {
  it("titles the section as a question, in a level-2 heading", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /cumplen lo que prometieron/i,
      }),
    ).toBeTruthy();
  });

  it("discloses the honesty caveat: what over/under 100% means and does NOT prove by itself", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    const caveat = screen
      .getByText(/no prueba por s[ií] sol[oa]/i)
      .closest("p")?.textContent;
    expect(caveat).toMatch(/reasignaciones leg[ií]timas/i);
    expect(caveat).toMatch(/derecho a ver y preguntar/i);
  });

  it("surfaces the over-executed área as a documentary highlight, with its exact % and peso gap", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    const label = screen.getByText(/caso que llama la atenci[oó]n/i);
    const highlight = label.closest("div");
    expect(highlight?.textContent).toMatch(/servicios de la deuda/i);
    expect(highlight?.textContent).toMatch(/1756%/);
    expect(highlight?.textContent).toMatch(/1\.570/); // gapArs, human-rounded millones
  });

  it("leads with a period-context paragraph explaining that ~20-30% execution in a quarter is the expected pace, not under-spending", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    const context = screen.getByText(new RegExp(PERIOD_LABEL)).closest("p")
      ?.textContent;
    expect(context).toMatch(/20%/);
    expect(context).toMatch(/30%/);
    expect(context).toMatch(/ritmo esperado/i);
    expect(context).toMatch(/no.*señal.*gasta de menos/i);
  });

  it("never frames a low Q1 % ejecutado (19-34% range) as an under-spending finding", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    expect(screen.queryByText(/menor ejecuci[oó]n relativa/i)).toBeNull();
  });

  it("renders every área with presupuestado, ejecutado and % ejecutado", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    for (const area of AREAS) {
      const row = getRowByName(area.name);
      expect(row.textContent).toMatch(/presupuestado/i);
      expect(row.textContent).toMatch(/% ejecutado/i);
    }
  });

  it("never colors % ejecutado with --olive/--stamp -- it is a ratio within one period, not a variation over time", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    for (const area of AREAS) {
      const row = getRowByName(area.name);
      expect(row.innerHTML).not.toMatch(/text-olive/);
      expect(row.innerHTML).not.toMatch(/text-stamp/);
    }
  });

  it("marks only the over-executed área's row with the ocre documentary accent, never the others", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    const overRow = getRowByName("Servicios de la Deuda");
    expect(overRow.className).toMatch(/border-ocre/);
    const normalRow = getRowByName("H.C.D.");
    expect(normalRow.className).not.toMatch(/border-ocre/);
  });

  it("sorts áreas by % ejecutado descending, the standout case first", () => {
    render(<PresupuestoEjecucionSection areas={AREAS} periodLabel={PERIOD_LABEL} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Servicios de la Deuda")).toBeTruthy();
  });

  it("never renders a per-área row without a computable fraction as 100% or hides it", () => {
    const withNullFraction: AreaEjecucion[] = [
      ...AREAS,
      {
        code: "0000000000",
        name: "Área sin vigente",
        vigenteArs: 0,
        devengadoArs: 0,
        executionFraction: null,
        gapArs: 0,
      },
    ];
    render(<PresupuestoEjecucionSection areas={withNullFraction} periodLabel={PERIOD_LABEL} />);
    expect(screen.getByText("Área sin vigente")).toBeTruthy();
  });
});
