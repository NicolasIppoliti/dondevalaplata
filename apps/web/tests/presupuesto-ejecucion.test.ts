import { describe, expect, it } from "vitest";
import type { GastoPartidaJurisdiccion } from "@/lib/schemas";
import {
  buildAreaEjecucion,
  leastExecutedAreas,
  overExecutedAreas,
  reconcileAreaTotals,
  sortByExecutionDesc,
} from "@/lib/presupuestoEjecucion";
import { getPortalData } from "@/lib/sources";

/**
 * Feature H1: "¿Cumplen lo que prometieron?" -- Presupuesto vs. Ejecución
 * por área. These are PURE re-aggregation helpers over the SAME
 * Jurisdicción -> Programa -> Objeto tree feature G2 already parses and
 * reconciles (`data/gasto-partida.json`) -- no new ETL output, no new
 * archived source. See `lib/presupuestoEjecucion.ts` for the "why a TS lib
 * fn, not a new Python ETL artifact" decision.
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
            code: "5.1.1.0",
            name: "Intereses de la deuda",
            vigenteArs: 100,
            devengadoArs: 1756,
            pagadoArs: 1756,
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
  {
    // Vigente = 0 across the whole área -- executionFraction must stay
    // `null` (never NaN/Infinity), and it must never be silently dropped
    // from the aggregation or the sort.
    code: "9999999999",
    name: "Área sin presupuesto vigente",
    programas: [
      {
        code: "99.00.00",
        name: "Programa sin vigente",
        objetos: [
          {
            code: "9.9.9.0",
            name: "Objeto sin vigente",
            vigenteArs: 0,
            devengadoArs: 0,
            pagadoArs: 0,
            verified: true,
          },
        ],
      },
    ],
  },
];

describe("buildAreaEjecucion", () => {
  const areas = buildAreaEjecucion(TREE);

  it("returns one row per área (jurisdicción), summing vigente/devengado across every programa/objeto", () => {
    expect(areas).toHaveLength(4);
    const conduccion = areas.find((a) => a.code === "1110101000");
    expect(conduccion).toEqual({
      code: "1110101000",
      name: "Conducción Superior",
      vigenteArs: 300,
      devengadoArs: 150,
      executionFraction: 0.5,
      gapArs: -150,
    });
  });

  it("allows a fraction above 1 and a positive gap, never clamped to 100%", () => {
    const deuda = areas.find((a) => a.code === "1110190000");
    expect(deuda?.vigenteArs).toBe(100);
    expect(deuda?.devengadoArs).toBe(1756);
    expect(deuda?.executionFraction).toBe(17.56);
    expect(deuda?.gapArs).toBe(1656);
  });

  it("returns a negative gap when devengado is below vigente", () => {
    const hcd = areas.find((a) => a.code === "1110200000");
    expect(hcd?.gapArs).toBe(187 - 1000);
  });

  it("returns null executionFraction (never NaN/Infinity) when an área's vigente totals 0, and never drops the área", () => {
    const sinVigente = areas.find((a) => a.code === "9999999999");
    expect(sinVigente?.executionFraction).toBeNull();
    expect(sinVigente?.vigenteArs).toBe(0);
  });
});

describe("sortByExecutionDesc", () => {
  it("sorts by % ejecutado descending, with null-fraction áreas last (never dropped)", () => {
    const areas = buildAreaEjecucion(TREE);
    const sorted = sortByExecutionDesc(areas);
    expect(sorted.map((a) => a.code)).toEqual([
      "1110190000", // 1756%
      "1110101000", // 50%
      "1110200000", // 18.7%
      "9999999999", // null, sorts last
    ]);
  });
});

describe("overExecutedAreas", () => {
  it("returns only áreas whose devengado exceeds their vigente, sorted descending", () => {
    const areas = buildAreaEjecucion(TREE);
    const over = overExecutedAreas(areas);
    expect(over).toHaveLength(1);
    expect(over[0].code).toBe("1110190000");
  });

  it("returns an empty array when no área exceeds 100%", () => {
    const areas = buildAreaEjecucion(TREE).filter(
      (a) => a.code !== "1110190000",
    );
    expect(overExecutedAreas(areas)).toHaveLength(0);
  });
});

describe("leastExecutedAreas", () => {
  it("returns the N áreas with the lowest computable % ejecutado, excluding null-fraction áreas", () => {
    const areas = buildAreaEjecucion(TREE);
    const least = leastExecutedAreas(areas, 1);
    expect(least).toHaveLength(1);
    expect(least[0].code).toBe("1110200000");
  });
});

describe("reconcileAreaTotals", () => {
  it("sums every área's vigente/devengado without dropping or double-counting a peso", () => {
    const areas = buildAreaEjecucion(TREE);
    const totals = reconcileAreaTotals(areas);
    expect(totals).toEqual({ vigenteArs: 1400, devengadoArs: 2093 });
  });

  it("reconciles against the real repo data: the sum of every área equals the document's own reconciled grand total (G2's honesty gate)", () => {
    const { gastoPartida } = getPortalData();
    const areas = buildAreaEjecucion(gastoPartida.jurisdicciones);
    const totals = reconcileAreaTotals(areas);
    expect(
      Math.abs(totals.vigenteArs - gastoPartida.reconciliation.totalVigenteArs),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(
        totals.devengadoArs - gastoPartida.reconciliation.totalDevengadoArs,
      ),
    ).toBeLessThan(0.01);
    // Golden number (same convention as data.test.ts's `transparencia.total
    // === 81`): documents the real, currently-known official total so a
    // future data refresh that silently changes it is caught loudly.
    expect(Math.round(totals.devengadoArs)).toBe(11812638196);
  });
});
