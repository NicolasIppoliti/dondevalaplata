import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import manifestMalformed from "./fixtures/manifest.malformed.json";
import coparticipacionValid from "./fixtures/coparticipacion.valid.json";
import coparticipacionMalformed from "./fixtures/coparticipacion.malformed.json";
import fallosValid from "./fixtures/fallos.valid.json";
import fallosMalformed from "./fixtures/fallos.malformed.json";
import { loadCoparticipacion, loadFallos, loadManifest } from "@/lib/data";

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

describe("loaders reading real build-time JSON with no argument", () => {
  it("loads the real archive-manifest.json, coparticipacion.json and fallos.json", () => {
    expect(loadManifest().length).toBeGreaterThan(0);
    expect(loadCoparticipacion().series.length).toBeGreaterThan(0);
    expect(loadFallos().records.length).toBeGreaterThan(0);
  });
});
