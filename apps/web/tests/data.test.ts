import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import manifestMalformed from "./fixtures/manifest.malformed.json";
import coparticipacionValid from "./fixtures/coparticipacion.valid.json";
import coparticipacionMalformed from "./fixtures/coparticipacion.malformed.json";
import fallosValid from "./fixtures/fallos.valid.json";
import fallosMalformed from "./fixtures/fallos.malformed.json";
import transparenciaValid from "./fixtures/transparencia.valid.json";
import transparenciaMalformed from "./fixtures/transparencia.malformed.json";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import cadenciaMalformed from "./fixtures/cadencia.malformed.json";
import gastoPartidaValid from "./fixtures/gasto-partida.valid.json";
import gastoPartidaMalformed from "./fixtures/gasto-partida.malformed.json";
import adjudicacionesValid from "./fixtures/adjudicaciones.valid.json";
import adjudicacionesMalformed from "./fixtures/adjudicaciones.malformed.json";
import proveedoresValid from "./fixtures/proveedores.valid.json";
import {
  loadAdjudicaciones,
  loadCadencia,
  loadCoparticipacion,
  loadFallos,
  loadGastoPartida,
  loadManifest,
  loadProveedores,
  loadTransparencia,
} from "@/lib/data";

describe("loadManifest", () => {
  it("accepts a valid manifest fixture", () => {
    const manifest = loadManifest(manifestValid);
    expect(manifest).toHaveLength(3);
    expect(manifest[0].id).toBe("coparticipacion/transferencias-municipios");
  });

  it("rejects a malformed manifest fixture", () => {
    expect(() => loadManifest(manifestMalformed)).toThrow();
  });
});

describe("loadCoparticipacion", () => {
  it("accepts a valid coparticipacion fixture", () => {
    const data = loadCoparticipacion(coparticipacionValid);
    expect(data.baseMonth).toBe("2026-05");
    expect(data.series[0].points).toHaveLength(2);
  });

  it("rejects a malformed coparticipacion fixture", () => {
    expect(() => loadCoparticipacion(coparticipacionMalformed)).toThrow();
  });
});

describe("loadFallos", () => {
  it("accepts a valid fallos fixture", () => {
    const data = loadFallos(fallosValid);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].administration).toContain("Uset");
  });

  it("rejects a malformed fallos fixture", () => {
    expect(() => loadFallos(fallosMalformed)).toThrow();
  });
});

describe("loadTransparencia", () => {
  it("accepts a valid transparencia fixture", () => {
    const data = loadTransparencia(transparenciaValid);
    expect(data.source).toBe("ASAP");
    expect(data.sourceType).toBe("asociación civil (no es un ministerio)");
    expect(data.total).toBe(81);
    expect(data.dimensions).toHaveLength(6);
    expect(data.trend).toHaveLength(2);
  });

  it("rejects a malformed transparencia fixture", () => {
    expect(() => loadTransparencia(transparenciaMalformed)).toThrow();
  });

  it("never claims ASAP is a ministry (regression guard for the corrected attribution)", () => {
    const data = loadTransparencia(transparenciaValid);
    expect(data.source.toLowerCase()).not.toContain("ministerio");
    expect(data.sourceFullName.toLowerCase()).not.toContain("capital humano");
  });

  it("HONESTY TEST: the published breakdown sums to the total and no dimension exceeds its own max", () => {
    const data = loadTransparencia(transparenciaValid);
    const sum = data.dimensions.reduce((acc, d) => acc + d.got, 0);
    expect(sum).toBe(data.total);
    for (const dimension of data.dimensions) {
      expect(dimension.got).toBeLessThanOrEqual(dimension.max);
    }
  });
});

describe("loadCadencia", () => {
  it("accepts a valid cadencia fixture", () => {
    const data = loadCadencia(cadenciaValid);
    expect(data.asapReport).toBe("Mayo 2026");
    expect(data.dimensions).toHaveLength(6);
    expect(data.deuda.lastPeriod).toBe("3er trimestre 2025");
  });

  it("rejects a malformed cadencia fixture", () => {
    expect(() => loadCadencia(cadenciaMalformed)).toThrow();
  });

  it("HONESTY TEST: the live-derived dimensions sum to the same 81 total, no dimension exceeds its own max", () => {
    const data = loadCadencia(cadenciaValid);
    const sum = data.dimensions.reduce((acc, d) => acc + d.got, 0);
    expect(sum).toBe(81);
    for (const dimension of data.dimensions) {
      expect(dimension.got).toBeLessThanOrEqual(dimension.max);
    }
  });
});

describe("loadGastoPartida", () => {
  it("accepts a valid gasto-partida fixture", () => {
    const data = loadGastoPartida(gastoPartidaValid);
    expect(data.period.label).toBe("1er trimestre 2026");
    expect(data.jurisdicciones).toHaveLength(1);
    expect(data.jurisdicciones[0].programas[0].objetos).toHaveLength(2);
  });

  it("rejects a malformed gasto-partida fixture", () => {
    expect(() => loadGastoPartida(gastoPartidaMalformed)).toThrow();
  });

  it("HONESTY TEST: reconciliation.reconciles is true and diffs are within tolerance", () => {
    const data = loadGastoPartida(gastoPartidaValid);
    expect(data.reconciliation.reconciles).toBe(true);
    expect(Math.abs(data.reconciliation.diffDevengadoArs)).toBeLessThanOrEqual(
      data.reconciliation.toleranceArs,
    );
  });
});

describe("loadAdjudicaciones", () => {
  it("accepts a valid adjudicaciones fixture", () => {
    const data = loadAdjudicaciones(adjudicacionesValid);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].proveedor).toBe("SEDARRI SERGIO ARIEL");
    expect(data.records[0].montoArs).toBe(17760000);
  });

  it("rejects a malformed adjudicaciones fixture (bad date format, negative amount)", () => {
    expect(() => loadAdjudicaciones(adjudicacionesMalformed)).toThrow();
  });
});

describe("loadProveedores", () => {
  it("accepts a valid proveedores fixture", () => {
    const data = loadProveedores(proveedoresValid);
    expect(data.proveedores).toHaveLength(1);
    expect(data.proveedores[0].totalArs).toBe(17760000);
    expect(data.proveedores[0].decretoRefs).toEqual(["524/2023"]);
  });
});

describe("loaders reading real build-time JSON with no argument", () => {
  it("loads the real archive-manifest.json, coparticipacion.json, fallos.json and transparencia.json", () => {
    expect(loadManifest().length).toBeGreaterThan(0);
    expect(loadCoparticipacion().series.length).toBeGreaterThan(0);
    expect(loadFallos().records.length).toBeGreaterThan(0);
    const transparencia = loadTransparencia();
    expect(transparencia.total).toBe(81);
    expect(transparencia.max).toBe(100);
  });

  it("loads the real data/gasto-partida.json, HONESTY TEST: reconciliation.reconciles is true", () => {
    const gastoPartida = loadGastoPartida();
    expect(gastoPartida.reconciliation.reconciles).toBe(true);
    expect(gastoPartida.jurisdicciones.length).toBeGreaterThan(0);
  });

  it("loads the real data/adjudicaciones.json and data/proveedores.json", () => {
    const adjudicaciones = loadAdjudicaciones();
    expect(adjudicaciones.records.length).toBeGreaterThan(0);
    for (const record of adjudicaciones.records) {
      expect(record.montoArs).toBeGreaterThan(0);
    }
    const proveedores = loadProveedores();
    expect(proveedores.proveedores.length).toBeGreaterThan(0);
  });

  it("HONESTY TEST (real repo data): dimensions sum to the total, every got <= max", () => {
    const transparencia = loadTransparencia();
    const sum = transparencia.dimensions.reduce((acc, d) => acc + d.got, 0);
    expect(sum).toBe(transparencia.total);
    for (const dimension of transparencia.dimensions) {
      expect(dimension.got).toBeLessThanOrEqual(dimension.max);
    }
  });

  it("loads the real data/cadencia.json, live-derived dimensions still sum to the same 81 total", () => {
    const cadencia = loadCadencia();
    expect(cadencia.dimensions).toHaveLength(6);
    const sum = cadencia.dimensions.reduce((acc, d) => acc + d.got, 0);
    expect(sum).toBe(81);
    for (const dimension of cadencia.dimensions) {
      expect(dimension.got).toBeLessThanOrEqual(dimension.max);
    }
  });
});
