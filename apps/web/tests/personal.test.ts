import { describe, expect, it } from "vitest";
import type { GastoPartidaJurisdiccion } from "@/lib/schemas";
import {
  isPersonalObjeto,
  personalByArea,
  personalShareOfTotal,
  personalTotals,
  sortByDevengadoDesc,
} from "@/lib/personal";
import { getPortalData } from "@/lib/sources";

/**
 * Feature: "¿Cuánto se va en sueldos?" -- aggregates every objeto del gasto
 * whose "clasificador por objeto del gasto" PRINCIPAL segment is "1"
 * ("Gastos en Personal") across the WHOLE Jurisdicción -> Programa -> Objeto
 * tree feature G2 already parses and reconciles to the centavo
 * (`data/gasto-partida.json`) -- same "no new ETL artifact" decision
 * `lib/presupuestoEjecucion.ts` already made: this re-aggregates data that
 * is ALREADY fully present and reconciled, so a second parse/build step
 * would only risk drifting out of sync. No React here either -- pure
 * functions, unit-tested directly (`components/personal/PersonalSection.tsx`
 * is the only consumer).
 */

const TREE: GastoPartidaJurisdiccion[] = [
  {
    code: "1110101000",
    name: "Conducción Superior",
    programas: [
      {
        code: "01.00.00",
        name: "Coordinación y gestión de políticas centrales",
        objetos: [
          {
            code: "1.1.1.0",
            name: "Retribuciones del cargo",
            vigenteArs: 200,
            devengadoArs: 100,
            pagadoArs: 80,
            verified: true,
          },
          {
            code: "1.3.0.0",
            name: "Sueldo Anual Complementario",
            vigenteArs: 50,
            devengadoArs: 20,
            pagadoArs: 20,
            verified: true,
          },
          {
            code: "2.5.6.0",
            name: "Combustibles y lubricantes",
            vigenteArs: 100,
            devengadoArs: 50,
            pagadoArs: 20,
            verified: true,
          },
        ],
      },
    ],
  },
  {
    code: "1110190000",
    name: "Servicios de la Deuda",
    programas: [
      {
        code: "05.00.00",
        name: "Servicio de la deuda pública",
        objetos: [
          {
            code: "7.1.1.0",
            name: "Intereses de la deuda",
            vigenteArs: 100,
            devengadoArs: 300,
            pagadoArs: 300,
            verified: true,
          },
        ],
      },
    ],
  },
  {
    code: "1110200000",
    name: "H.C.D.",
    programas: [
      {
        code: "09.00.00",
        name: "Concejo Deliberante",
        objetos: [
          {
            code: "1.1.1.0",
            name: "Retribuciones del cargo",
            vigenteArs: 1000,
            devengadoArs: 187,
            pagadoArs: 100,
            verified: true,
          },
        ],
      },
    ],
  },
];

// Total devengado across EVERY objeto in TREE (personal + non-personal):
// 100 + 20 + 50 + 300 + 187 = 657.
const TREE_TOTAL_DEVENGADO_ARS = 657;
// Total personal-only devengado: 100 + 20 + 187 = 307.
const TREE_PERSONAL_DEVENGADO_ARS = 307;

describe("isPersonalObjeto", () => {
  it('returns true only for codes whose principal segment (before the first ".") is exactly "1"', () => {
    expect(isPersonalObjeto({ code: "1.1.1.0" })).toBe(true);
    expect(isPersonalObjeto({ code: "1.3.0.0" })).toBe(true);
    expect(isPersonalObjeto({ code: "2.5.6.0" })).toBe(false);
    expect(isPersonalObjeto({ code: "7.1.1.0" })).toBe(false);
  });
});

describe("personalTotals", () => {
  it('sums vigente/devengado/pagado of ONLY code "1.*" objetos across every jurisdicción/programa', () => {
    const totals = personalTotals(TREE);
    expect(totals).toEqual({
      vigenteArs: 200 + 50 + 1000,
      devengadoArs: TREE_PERSONAL_DEVENGADO_ARS,
      pagadoArs: 80 + 20 + 100,
    });
  });

  it('excludes a Bienes de Consumo ("2.*") and a Servicios de la Deuda ("7.*") objeto entirely', () => {
    const totals = personalTotals(TREE);
    // If either leaked in, devengado would be 657 (the whole tree), not 307.
    expect(totals.devengadoArs).toBe(307);
    expect(totals.devengadoArs).not.toBe(TREE_TOTAL_DEVENGADO_ARS);
  });

  it("never mutates the input tree", () => {
    const before = JSON.stringify(TREE);
    personalTotals(TREE);
    expect(JSON.stringify(TREE)).toBe(before);
  });
});

describe("personalByArea", () => {
  it("returns one row per jurisdicción, summing only its own personal objetos", () => {
    const areas = personalByArea(TREE);
    expect(areas).toHaveLength(3);
    const conduccion = areas.find((a) => a.code === "1110101000");
    expect(conduccion).toEqual({
      code: "1110101000",
      name: "Conducción Superior",
      vigenteArs: 250,
      devengadoArs: 120,
      pagadoArs: 100,
    });
  });

  it("returns zero totals (never drops the área) when it has no code \"1.*\" objeto at all", () => {
    const areas = personalByArea(TREE);
    const deuda = areas.find((a) => a.code === "1110190000");
    expect(deuda).toEqual({
      code: "1110190000",
      name: "Servicios de la Deuda",
      vigenteArs: 0,
      devengadoArs: 0,
      pagadoArs: 0,
    });
  });
});

describe("sortByDevengadoDesc", () => {
  it("sorts áreas by personal devengado descending, never mutating the input array", () => {
    const areas = personalByArea(TREE);
    const sorted = sortByDevengadoDesc(areas);
    expect(sorted.map((a) => a.code)).toEqual([
      "1110200000", // 187
      "1110101000", // 120
      "1110190000", // 0
    ]);
    expect(areas.map((a) => a.code)).toEqual([
      "1110101000",
      "1110190000",
      "1110200000",
    ]);
  });
});

describe("personalShareOfTotal", () => {
  it("computes the fraction personal devengado represents of TOTAL devengado (all objetos, not just personal)", () => {
    const totals = personalTotals(TREE);
    const share = personalShareOfTotal(
      totals.devengadoArs,
      TREE_TOTAL_DEVENGADO_ARS,
    );
    expect(share).toBeCloseTo(307 / 657, 10);
  });

  it("returns null (never NaN/Infinity) when total devengado is 0", () => {
    expect(personalShareOfTotal(0, 0)).toBeNull();
  });
});

describe("real repo data (data/gasto-partida.json)", () => {
  it("personal devengado is positive and never exceeds the reconciled totals (sanity assert: personal <= total gasto)", () => {
    const { gastoPartida } = getPortalData();
    const totals = personalTotals(gastoPartida.jurisdicciones);
    expect(totals.devengadoArs).toBeGreaterThan(0);
    expect(totals.devengadoArs).toBeLessThanOrEqual(
      gastoPartida.reconciliation.totalDevengadoArs,
    );
    expect(totals.vigenteArs).toBeLessThanOrEqual(
      gastoPartida.reconciliation.totalVigenteArs,
    );
    expect(totals.pagadoArs).toBeLessThanOrEqual(
      gastoPartida.reconciliation.totalPagadoArs,
    );
  });

  it("matches the currently-known real personnel devengado total and its % of the budget (golden number, same convention as data.test.ts)", () => {
    const { gastoPartida } = getPortalData();
    const totals = personalTotals(gastoPartida.jurisdicciones);
    expect(Math.round(totals.devengadoArs)).toBe(7641899935);
    const share = personalShareOfTotal(
      totals.devengadoArs,
      gastoPartida.reconciliation.totalDevengadoArs,
    );
    expect(share).not.toBeNull();
    expect(Math.round((share ?? 0) * 100)).toBe(65);
  });

  it("every área's personal devengado sums back to the global personal total (no área drops or double-counts a peso)", () => {
    const { gastoPartida } = getPortalData();
    const totals = personalTotals(gastoPartida.jurisdicciones);
    const areas = personalByArea(gastoPartida.jurisdicciones);
    const sumOfAreas = areas.reduce((acc, a) => acc + a.devengadoArs, 0);
    expect(Math.abs(sumOfAreas - totals.devengadoArs)).toBeLessThan(0.01);
  });
});
