import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import { loadManifest } from "@/lib/data";
import { resolveSourceRef, resolveSourceRefs, shortHash } from "@/lib/sources";

const manifest = loadManifest(manifestValid);

describe("resolveSourceRef", () => {
  it("returns both the original and archived link for a known id", () => {
    const link = resolveSourceRef("ipc/nivel-general-nacional", manifest);
    expect(link.sourceUrl).toContain("apis.datos.gob.ar");
    expect(link.archivedUrl).toContain("pub-example.r2.dev");
    expect(link.sha256).toHaveLength(64);
  });

  it("throws a descriptive error for an unknown id", () => {
    expect(() => resolveSourceRef("does-not-exist", manifest)).toThrow(
      /does-not-exist/,
    );
  });
});

describe("resolveSourceRefs", () => {
  it("resolves multiple ids in order", () => {
    const links = resolveSourceRefs(
      ["coparticipacion/transferencias-municipios", "ipc/nivel-general-nacional"],
      manifest,
    );
    expect(links).toHaveLength(2);
    expect(links[0].id).toBe("coparticipacion/transferencias-municipios");
    expect(links[1].id).toBe("ipc/nivel-general-nacional");
  });
});

describe("shortHash", () => {
  it("truncates a sha256 to a readable prefix", () => {
    expect(shortHash("375cd4d3480077e93dc0a3d1ab6a15a49144477600d024489c943a8fb561ad3")).toBe(
      "375cd4d3480…",
    );
  });
});
