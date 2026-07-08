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
import pedidosValid from "./fixtures/pedidos.valid.json";
import pedidosMalformed from "./fixtures/pedidos.malformed.json";
import deudaHistoricaValid from "./fixtures/deuda-historica.valid.json";
import deudaHistoricaMalformed from "./fixtures/deuda-historica.malformed.json";
import novedadesValid from "./fixtures/novedades.valid.json";
import novedadesMalformed from "./fixtures/novedades.malformed.json";
import poblacionCensoValid from "./fixtures/poblacion-censo.valid.json";
import poblacionCensoMalformed from "./fixtures/poblacion-censo.malformed.json";
import {
  loadAdjudicaciones,
  loadCadencia,
  loadCoparticipacion,
  loadDeudaHistorica,
  loadFallos,
  loadGastoPartida,
  loadManifest,
  loadNovedades,
  loadPedidos,
  loadPoblacionCenso2022,
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

describe("loadPedidos", () => {
  it("accepts a valid pedidos fixture", () => {
    const data = loadPedidos(pedidosValid);
    expect(data.pedidos).toHaveLength(1);
    expect(data.pedidos[0].estado).toBe("respondido");
    expect(data.pedidos[0].expediente).toBe("BBC-100/26");
  });

  it("rejects a malformed pedidos fixture (bad date format, empty expediente, invalid estado)", () => {
    expect(() => loadPedidos(pedidosMalformed)).toThrow();
  });

  it("accepts an empty pedidos array (valid seed state before any pedido is filed)", () => {
    const data = loadPedidos({ generatedAt: "2026-07-08T00:00:00Z", pedidos: [] });
    expect(data.pedidos).toHaveLength(0);
  });
});

describe("loadDeudaHistorica", () => {
  it("accepts a valid deuda-historica fixture", () => {
    const data = loadDeudaHistorica(deudaHistoricaValid);
    expect(data.series).toHaveLength(3);
    expect(data.series[0].period).toBe("2025-Q1");
    expect(data.series[2].totalArs).toBeCloseTo(46876896.86);
  });

  it("rejects a malformed deuda-historica fixture (bad period/fecha format, string amount)", () => {
    expect(() => loadDeudaHistorica(deudaHistoricaMalformed)).toThrow();
  });
});

describe("loadNovedades", () => {
  it("accepts a valid novedades fixture", () => {
    const data = loadNovedades(novedadesValid);
    expect(data.events).toHaveLength(3);
    expect(data.events.map((e) => e.kind)).toEqual([
      "seeded",
      "auto-detected",
      "auto-stale",
    ]);
  });

  it("rejects a malformed novedades fixture (invalid kind enum value)", () => {
    expect(() => loadNovedades(novedadesMalformed)).toThrow();
  });
});

describe("loadPoblacionCenso2022", () => {
  it("accepts a valid poblacion-censo fixture", () => {
    const data = loadPoblacionCenso2022(poblacionCensoValid);
    expect(data.censusYear).toBe(2022);
    expect(data.municipios).toHaveLength(4);
    const coronelRosales = data.municipios.find(
      (m) => m.municipioId === "06182",
    );
    expect(coronelRosales?.poblacion).toBe(67503);
  });

  it("rejects a malformed poblacion-censo fixture (string censusYear, negative poblacion)", () => {
    expect(() => loadPoblacionCenso2022(poblacionCensoMalformed)).toThrow();
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

  it("loads the real data/pedidos.json (feature G4 seed -- may be empty or an example row)", () => {
    const pedidos = loadPedidos();
    expect(Array.isArray(pedidos.pedidos)).toBe(true);
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

  it("loads the real data/deuda-historica.json (feature H2a): 3 published quarters, oldest first", () => {
    const deudaHistorica = loadDeudaHistorica();
    expect(deudaHistorica.series).toHaveLength(3);
    expect(deudaHistorica.series.map((p) => p.period)).toEqual([
      "2025-Q1",
      "2025-Q2",
      "2025-Q3",
    ]);
    for (const point of deudaHistorica.series) {
      expect(point.totalArs).toBeGreaterThan(0);
    }
  });

  it("loads the real data/novedades.json (feature H2b): every event kind is one of the three labeled kinds", () => {
    const novedades = loadNovedades();
    expect(novedades.events.length).toBeGreaterThan(0);
    for (const event of novedades.events) {
      expect(["seeded", "auto-detected", "auto-stale"]).toContain(event.kind);
    }
  });

  it("loads the real data/poblacion-censo-2022.json (feature H3a): the same 4 municipios as coparticipacion", () => {
    const poblacionCenso = loadPoblacionCenso2022();
    const coparticipacion = loadCoparticipacion();
    expect(poblacionCenso.censusYear).toBe(2022);
    const poblacionIds = poblacionCenso.municipios
      .map((m) => m.municipioId)
      .sort();
    const coparticipacionIds = coparticipacion.series
      .map((s) => s.municipioId)
      .sort();
    expect(poblacionIds).toEqual(coparticipacionIds);
    for (const municipio of poblacionCenso.municipios) {
      expect(municipio.poblacion).toBeGreaterThan(0);
    }
  });
});
