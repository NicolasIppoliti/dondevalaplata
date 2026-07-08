import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import coparticipacionValid from "./fixtures/coparticipacion.valid.json";
import fallosValid from "./fixtures/fallos.valid.json";
import transparenciaValid from "./fixtures/transparencia.valid.json";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import {
  loadCadencia,
  loadCoparticipacion,
  loadFallos,
  loadManifest,
  loadTransparencia,
} from "@/lib/data";
import {
  assertSourceRefsResolve,
  collectSourceRefs,
  getPortalData,
} from "@/lib/sources";

describe("collectSourceRefs + assertSourceRefsResolve (raw-data-archive build invariant)", () => {
  it("does not throw when every sourceRefs id resolves to a manifest record", () => {
    const manifest = loadManifest(manifestValid);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallos = loadFallos(fallosValid);
    const ids = collectSourceRefs(coparticipacion, fallos);
    expect(() => assertSourceRefsResolve(ids, manifest)).not.toThrow();
  });

  it("throws listing the dangling id when a sourceRefs id has no manifest record", () => {
    const manifest = loadManifest(manifestValid);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallosWithDanglingRef = loadFallos({
      ...fallosValid,
      records: [
        {
          ...fallosValid.records[0],
          sourceRefs: ["htc-fallos/does-not-exist-in-manifest"],
        },
      ],
    });
    const ids = collectSourceRefs(coparticipacion, fallosWithDanglingRef);
    expect(() => assertSourceRefsResolve(ids, manifest)).toThrow(
      /htc-fallos\/does-not-exist-in-manifest/,
    );
  });
});

describe("collectSourceRefs + assertSourceRefsResolve — transparencia (optional 3rd arg)", () => {
  it("does not throw when every transparencia sourceRefs/trend id resolves to a manifest record", () => {
    const transparencia = loadTransparencia(transparenciaValid);
    const manifest = loadManifest([
      ...manifestValid,
      {
        id: "asap-transparencia/informe-mayo-2026",
        capability: "asap-transparencia",
        source: "asap.org.ar",
        source_url: "https://asap.org.ar/example-mayo-2026.pdf",
        archived_url: "https://pub-example.r2.dev/asap-transparencia/mayo-2026.pdf",
        archived_path: "archive/asap-transparencia/mayo-2026.pdf",
        sha256: "689df97fe6f383a136d6a74c88cecce910b8e3f72e1385aa4e8253338aa723a1",
        mime: "application/pdf",
        bytes: 1093233,
        fetched_at: "2026-07-07T19:24:00Z",
        status: "ok",
        notes: "Fixture record for tests.",
      },
      {
        id: "asap-transparencia/informe-noviembre-2025",
        capability: "asap-transparencia",
        source: "asap.org.ar",
        source_url: "https://asap.org.ar/example-noviembre-2025.pdf",
        archived_url: "https://pub-example.r2.dev/asap-transparencia/noviembre-2025.pdf",
        archived_path: "archive/asap-transparencia/noviembre-2025.pdf",
        sha256: "ab953674d809233ee867f18a75d1befb9edf8d2b8c3702946c5da4f0b58f441",
        mime: "application/pdf",
        bytes: 969185,
        fetched_at: "2026-07-07T19:24:00Z",
        status: "ok",
        notes: "Fixture record for tests.",
      },
    ]);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallos = loadFallos(fallosValid);
    const ids = collectSourceRefs(coparticipacion, fallos, transparencia);
    expect(ids).toEqual(
      expect.arrayContaining([
        "asap-transparencia/informe-mayo-2026",
        "asap-transparencia/informe-noviembre-2025",
      ]),
    );
    expect(() => assertSourceRefsResolve(ids, manifest)).not.toThrow();
  });

  it("throws when a transparencia sourceRefs id has no manifest record", () => {
    const transparencia = loadTransparencia(transparenciaValid);
    const manifest = loadManifest(manifestValid);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallos = loadFallos(fallosValid);
    const ids = collectSourceRefs(coparticipacion, fallos, transparencia);
    expect(() => assertSourceRefsResolve(ids, manifest)).toThrow(
      /asap-transparencia\/informe-/,
    );
  });
});

describe("collectSourceRefs + assertSourceRefsResolve — cadencia (optional 4th arg)", () => {
  it("does not throw when every cadencia sourceRefs id resolves to a manifest record", () => {
    const transparencia = loadTransparencia(transparenciaValid);
    const cadencia = loadCadencia(cadenciaValid);
    const cadenciaManifestRecords = cadencia.sourceRefs.map((id) => ({
      id,
      capability: "mcr-docs",
      source: "mcr.gob.ar",
      source_url: `https://mcr.gob.ar/${id}`,
      archived_url: `https://pub-example.r2.dev/${id}.json`,
      archived_path: `archive/${id}.json`,
      sha256: "689df97fe6f383a136d6a74c88cecce910b8e3f72e1385aa4e8253338aa723a2",
      mime: "application/json",
      bytes: 1000,
      fetched_at: "2026-07-08T15:48:00Z",
      status: "ok",
      notes: "Fixture record for tests.",
    }));
    const manifest = loadManifest([...manifestValid, ...cadenciaManifestRecords]);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallos = loadFallos(fallosValid);
    const ids = collectSourceRefs(coparticipacion, fallos, transparencia, cadencia);
    expect(ids).toEqual(expect.arrayContaining(cadencia.sourceRefs));
    expect(() => assertSourceRefsResolve(ids, manifest)).not.toThrow();
  });

  it("throws when a cadencia sourceRefs id has no manifest record", () => {
    const transparencia = loadTransparencia(transparenciaValid);
    const cadencia = loadCadencia(cadenciaValid);
    // Only the ASAP PDF refs are present -- every mcr-docs/mcr-docs-snapshot
    // ref cadencia introduces is intentionally left dangling.
    const manifest = loadManifest([
      ...manifestValid,
      {
        id: "asap-transparencia/informe-mayo-2026",
        capability: "asap-transparencia",
        source: "asap.org.ar",
        source_url: "https://asap.org.ar/example-mayo-2026.pdf",
        archived_url: "https://pub-example.r2.dev/asap-transparencia/mayo-2026.pdf",
        archived_path: "archive/asap-transparencia/mayo-2026.pdf",
        sha256: "689df97fe6f383a136d6a74c88cecce910b8e3f72e1385aa4e8253338aa723a1",
        mime: "application/pdf",
        bytes: 1093233,
        fetched_at: "2026-07-07T19:24:00Z",
        status: "ok",
        notes: "Fixture record for tests.",
      },
      {
        id: "asap-transparencia/informe-noviembre-2025",
        capability: "asap-transparencia",
        source: "asap.org.ar",
        source_url: "https://asap.org.ar/example-noviembre-2025.pdf",
        archived_url: "https://pub-example.r2.dev/asap-transparencia/noviembre-2025.pdf",
        archived_path: "archive/asap-transparencia/noviembre-2025.pdf",
        sha256: "ab953674d809233ee867f18a75d1befb9edf8d2b8c3702946c5da4f0b58f441",
        mime: "application/pdf",
        bytes: 969185,
        fetched_at: "2026-07-07T19:24:00Z",
        status: "ok",
        notes: "Fixture record for tests.",
      },
    ]);
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const fallos = loadFallos(fallosValid);
    const ids = collectSourceRefs(coparticipacion, fallos, transparencia, cadencia);
    expect(() => assertSourceRefsResolve(ids, manifest)).toThrow(
      /mcr-docs/,
    );
  });
});

describe("getPortalData", () => {
  it("loads the real repo data/*.json + archive-manifest.json with every sourceRefs id resolving", () => {
    const portal = getPortalData();
    expect(portal.manifest.length).toBeGreaterThan(0);
    expect(portal.coparticipacion.series.length).toBeGreaterThan(0);
    expect(portal.fallos.records.length).toBeGreaterThan(0);
    expect(portal.transparencia.total).toBe(81);
    expect(portal.cadencia.dimensions).toHaveLength(6);
  });
});
