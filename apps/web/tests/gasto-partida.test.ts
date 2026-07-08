import { describe, expect, it } from "vitest";
import type { GastoPartidaJurisdiccion } from "@/lib/schemas";
import {
  executionFraction,
  filterGastoPartidaTree,
  jurisdiccionTotals,
  programaTotals,
} from "@/lib/gastoPartida";

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
    code: "1120000000",
    name: "Secretaría de Hacienda",
    programas: [
      {
        code: "02.00.00",
        name: "Administración financiera",
        objetos: [
          {
            code: "1.1.1.0",
            name: "Retribuciones del cargo",
            vigenteArs: 50,
            devengadoArs: 50,
            pagadoArs: 0,
            verified: false,
          },
        ],
      },
    ],
  },
];

describe("programaTotals / jurisdiccionTotals", () => {
  it("sums vigente/devengado/pagado across every objeto in a programa", () => {
    const totals = programaTotals(TREE[0].programas[0]);
    expect(totals).toEqual({ vigenteArs: 300, devengadoArs: 150, pagadoArs: 100 });
  });

  it("sums across every programa in a jurisdicción", () => {
    const totals = jurisdiccionTotals(TREE[0]);
    expect(totals).toEqual({ vigenteArs: 300, devengadoArs: 150, pagadoArs: 100 });
  });
});

describe("executionFraction", () => {
  it("returns devengado / vigente as a fraction", () => {
    expect(executionFraction({ vigenteArs: 200, devengadoArs: 100 })).toBe(0.5);
  });

  it("returns null (never Infinity/NaN) when vigente is 0", () => {
    expect(executionFraction({ vigenteArs: 0, devengadoArs: 50 })).toBeNull();
  });

  it("allows a fraction above 1 (execution can exceed a reduced Vigente, never clamped)", () => {
    expect(executionFraction({ vigenteArs: 50, devengadoArs: 75 })).toBe(1.5);
  });
});

describe("filterGastoPartidaTree", () => {
  it("returns the full tree, every node matched, for an empty query", () => {
    const filtered = filterGastoPartidaTree(TREE, "");
    expect(filtered).toHaveLength(2);
    expect(filtered[0].programas[0].objetos).toHaveLength(2);
    expect(filtered[0].matched).toBe(true);
  });

  it("keeps only the jurisdicción/programa/objeto branch matching a leaf-level query", () => {
    const filtered = filterGastoPartidaTree(TREE, "combustible");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe("1110101000");
    expect(filtered[0].programas).toHaveLength(1);
    expect(filtered[0].programas[0].objetos).toHaveLength(1);
    expect(filtered[0].programas[0].objetos[0].code).toBe("2.5.6.0");
  });

  it("is accent- and case-insensitive", () => {
    const filtered = filterGastoPartidaTree(TREE, "CONDUCCION superior");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe("1110101000");
  });

  it("keeps every descendant when the match is at the jurisdicción/programa level", () => {
    const filtered = filterGastoPartidaTree(TREE, "Hacienda");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].programas[0].objetos).toHaveLength(1);
    expect(filtered[0].programas[0].objetos[0].code).toBe("1.1.1.0");
  });

  it("matches by objeto código too, not just name", () => {
    const filtered = filterGastoPartidaTree(TREE, "1.1.1.0");
    // Matches the leaf code in BOTH jurisdicciones -- neither branch dropped.
    expect(filtered).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterGastoPartidaTree(TREE, "no existe esta partida")).toHaveLength(0);
  });
});
