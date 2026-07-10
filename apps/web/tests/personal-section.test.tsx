import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PersonalSection } from "@/components/personal/PersonalSection";
import type { AreaPersonal, PersonalTotals } from "@/lib/personal";

/**
 * "¿Cuánto se va en sueldos?" -- the ONLY consumer of `lib/personal.ts`.
 * Stays a plain server component (no "use client", no interaction) -- a
 * static, build-time-derived total + breakdown, same "cero JS" doctrine
 * already used by `PresupuestoEjecucionSection`.
 */

const PERIOD_LABEL = "1er trimestre 2026";

const TOTALS: PersonalTotals = {
  vigenteArs: 33_041_079_098.53,
  devengadoArs: 7_641_899_935.46,
  pagadoArs: 4_947_020_214.87,
};

const AREAS: AreaPersonal[] = [
  {
    code: "1110108000",
    name: "Secretaria de Salud",
    vigenteArs: 12_000_000_000,
    devengadoArs: 2_662_602_103.8,
    pagadoArs: 1_800_000_000,
  },
  {
    code: "1110117000",
    name: "Secretaría de Obras y Servicios Públicos",
    vigenteArs: 8_000_000_000,
    devengadoArs: 1_721_193_398.27,
    pagadoArs: 1_000_000_000,
  },
  {
    code: "1110190000",
    name: "Servicios de la Deuda",
    vigenteArs: 0,
    devengadoArs: 0,
    pagadoArs: 0,
  },
];

const SHARE_OF_TOTAL = 0.6469; // 64.69% -> rounds to 65%

function getRowByName(name: string): HTMLElement {
  const rows = screen.getAllByRole("listitem");
  const row = rows.find((li) => li.textContent?.includes(name));
  if (!row) throw new Error(`no row found for área "${name}"`);
  return row;
}

describe("PersonalSection", () => {
  it("titles the section as a question, in a level-2 heading", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /cu[aá]nto se va en sueldos/i,
      }),
    ).toBeTruthy();
  });

  it("shows the total gasto en personal devengado, human-rounded", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    // formatArsHuman(7_641_899_935.46) -> "$ 7.640 millones"
    expect(screen.getByText(/7\.640 millones/)).toBeTruthy();
  });

  it("shows the % of the total budget personnel represents, rounded, in NEUTRAL ink (never --olive/--stamp -- a ratio within one period, not a variation over time)", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const pct = screen.getByText(/65%/);
    expect(pct).toBeTruthy();
    expect(pct.className).not.toMatch(/text-olive/);
    expect(pct.className).not.toMatch(/text-stamp/);
  });

  it("shows 's/d' (never a fabricated 0%) when shareOfTotal is null", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={null}
        periodLabel={PERIOD_LABEL}
      />,
    );
    expect(screen.getByText("s/d")).toBeTruthy();
  });

  it("discloses the period-context honesty caveat: a Q1 figure is ~a quarter of the year, so the % is a point-in-time execution ratio", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const context = screen
      .getByText(/cuarta parte del año/i)
      .closest("p")?.textContent;
    expect(context).toMatch(new RegExp(PERIOD_LABEL));
  });

  it('discloses the FOIA honesty caveat: itemized detail (quién cobra cuánto) is not public, cites Ordenanza 3638 Art. 11, links to /pedidos', () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/no es p[uú]blico/i);
    expect(text).toMatch(/Ordenanza 3638/);
    expect(text).toMatch(/Art\.?\s*11/);
    const link = screen.getByRole("link", { name: /pedí el detalle/i });
    expect(link.getAttribute("href")).toBe("/pedidos");
  });

  it("never names any official or uses adjectival/judgmental language in the FOIA caveat", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const text = (document.body.textContent ?? "").toLowerCase();
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/);
  });

  it("renders every área from the breakdown, sorted by personal devengado descending", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Secretaria de Salud")).toBeTruthy();
  });

  it("never drops an área with zero personal devengado", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    expect(getRowByName("Servicios de la Deuda")).toBeTruthy();
  });

  it("uses the ocre documentary accent for the breakdown bars, never an alarm/judgment color, and never a ▲/▼ marker", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    const row = getRowByName("Secretaria de Salud");
    expect(row.innerHTML).toMatch(/bg-ocre/);
    expect(row.textContent).not.toMatch(/[▲▼]/);
  });

  it("never mentions titularidad (the parked feature must not leak into unrelated sections)", () => {
    render(
      <PersonalSection
        totals={TOTALS}
        areas={AREAS}
        shareOfTotal={SHARE_OF_TOTAL}
        periodLabel={PERIOD_LABEL}
      />,
    );
    expect(document.body.textContent ?? "").not.toMatch(/titularidad/i);
  });
});
