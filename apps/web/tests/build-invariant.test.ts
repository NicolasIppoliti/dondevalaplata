import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import coparticipacionValid from "./fixtures/coparticipacion.valid.json";
import fallosValid from "./fixtures/fallos.valid.json";
import { loadCoparticipacion, loadFallos, loadManifest } from "@/lib/data";
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

describe("getPortalData", () => {
  it("loads the real repo data/*.json + archive-manifest.json with every sourceRefs id resolving", () => {
    const portal = getPortalData();
    expect(portal.manifest.length).toBeGreaterThan(0);
    expect(portal.coparticipacion.series.length).toBeGreaterThan(0);
    expect(portal.fallos.records.length).toBeGreaterThan(0);
  });
});
