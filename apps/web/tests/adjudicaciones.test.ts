import { describe, expect, it } from "vitest";
import {
  filterAdjudicaciones,
  filterProveedores,
  sortAdjudicaciones,
  sortProveedores,
} from "@/lib/adjudicaciones";
import type { AdjudicacionRecord, ProveedorRecord } from "@/lib/schemas";

const RECORDS: AdjudicacionRecord[] = [
  {
    decreto: "524/2023",
    fecha: "2023-09-07",
    expediente: "D-79/23",
    proveedor: "SEDARRI SERGIO ARIEL",
    montoArs: 17_760_000,
    procedimiento: "Licitación Privada Nº 4/23",
    objeto: "Hotelería para delegación",
    bulletinNumber: 36,
    sourceRef: "sibom-actos/boletin-036-decreto-524-2023",
  },
  {
    decreto: "205/2022",
    fecha: "2022-05-10",
    expediente: "J-031/22",
    proveedor: "RO-BOT S.R.L",
    montoArs: 2_556_689,
    procedimiento: "Licitación Privada Nº 1/22",
    objeto: "Ropa para personal obrero",
    bulletinNumber: 31,
    sourceRef: "sibom-actos/boletin-031-decreto-205-2022",
  },
  {
    decreto: "600/2024",
    fecha: "2024-11-19",
    expediente: null,
    proveedor: "RIMSOL S.A",
    montoArs: 561_768_379,
    procedimiento: "Licitación Pública Nº 2/24",
    objeto: "Repavimentación arterias varias",
    bulletinNumber: 46,
    sourceRef: "sibom-actos/boletin-046-decreto-600-2024",
  },
];

describe("filterAdjudicaciones", () => {
  it("returns every record for an empty query", () => {
    expect(filterAdjudicaciones(RECORDS, "")).toHaveLength(3);
  });

  it("matches by vendor name, accent- and case-insensitive", () => {
    const result = filterAdjudicaciones(RECORDS, "sedarri");
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe("SEDARRI SERGIO ARIEL");
  });

  it("matches by decreto number", () => {
    const result = filterAdjudicaciones(RECORDS, "600/2024");
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe("RIMSOL S.A");
  });

  it("matches by objeto text", () => {
    const result = filterAdjudicaciones(RECORDS, "repavimentación");
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe("RIMSOL S.A");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterAdjudicaciones(RECORDS, "no existe ningún proveedor así")).toHaveLength(0);
  });
});

describe("sortAdjudicaciones", () => {
  it("sorts by fecha descending (default, most recent first)", () => {
    const sorted = sortAdjudicaciones(RECORDS, "fecha", "desc");
    expect(sorted.map((r) => r.fecha)).toEqual(["2024-11-19", "2023-09-07", "2022-05-10"]);
  });

  it("sorts by fecha ascending", () => {
    const sorted = sortAdjudicaciones(RECORDS, "fecha", "asc");
    expect(sorted.map((r) => r.fecha)).toEqual(["2022-05-10", "2023-09-07", "2024-11-19"]);
  });

  it("sorts by montoArs descending", () => {
    const sorted = sortAdjudicaciones(RECORDS, "montoArs", "desc");
    expect(sorted.map((r) => r.proveedor)).toEqual([
      "RIMSOL S.A",
      "SEDARRI SERGIO ARIEL",
      "RO-BOT S.R.L",
    ]);
  });

  it("sorts by proveedor ascending (alphabetical)", () => {
    const sorted = sortAdjudicaciones(RECORDS, "proveedor", "asc");
    expect(sorted.map((r) => r.proveedor)).toEqual([
      "RIMSOL S.A",
      "RO-BOT S.R.L",
      "SEDARRI SERGIO ARIEL",
    ]);
  });

  it("never mutates the input array", () => {
    const original = [...RECORDS];
    sortAdjudicaciones(RECORDS, "montoArs", "asc");
    expect(RECORDS).toEqual(original);
  });
});

const PROVEEDORES: ProveedorRecord[] = [
  {
    proveedor: "COMADAR S.R.L",
    totalArs: 616_049_550,
    count: 5,
    firstDate: "2024-07-04",
    lastDate: "2026-03-18",
    decretoRefs: ["324/2024", "643/2024", "351/2025", "98/2026", "115/2026"],
  },
  {
    proveedor: "SEDARRI SERGIO ARIEL",
    totalArs: 17_760_000,
    count: 1,
    firstDate: "2023-09-07",
    lastDate: "2023-09-07",
    decretoRefs: ["524/2023"],
  },
];

describe("filterProveedores", () => {
  it("matches by vendor name, accent- and case-insensitive", () => {
    const result = filterProveedores(PROVEEDORES, "comadar");
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe("COMADAR S.R.L");
  });

  it("returns every proveedor for an empty query", () => {
    expect(filterProveedores(PROVEEDORES, "")).toHaveLength(2);
  });
});

describe("sortProveedores", () => {
  it("sorts by totalArs descending by default", () => {
    const sorted = sortProveedores(PROVEEDORES, "totalArs", "desc");
    expect(sorted.map((p) => p.proveedor)).toEqual(["COMADAR S.R.L", "SEDARRI SERGIO ARIEL"]);
  });

  it("sorts by count ascending", () => {
    const sorted = sortProveedores(PROVEEDORES, "count", "asc");
    expect(sorted.map((p) => p.count)).toEqual([1, 5]);
  });
});
