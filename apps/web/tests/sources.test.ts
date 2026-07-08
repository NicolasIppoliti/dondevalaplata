import { describe, expect, it } from "vitest";
import manifestValid from "./fixtures/manifest.valid.json";
import fallosValid from "./fixtures/fallos.valid.json";
import { loadFallos, loadManifest } from "@/lib/data";
import {
  getFalloEjerciciosDescending,
  resolveSourceRef,
  resolveSourceRefs,
  selectFallosPreview,
  shortHash,
} from "@/lib/sources";

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
      [
        "coparticipacion/transferencias-municipios",
        "ipc/nivel-general-nacional",
      ],
      manifest,
    );
    expect(links).toHaveLength(2);
    expect(links[0].id).toBe("coparticipacion/transferencias-municipios");
    expect(links[1].id).toBe("ipc/nivel-general-nacional");
  });
});

describe("shortHash", () => {
  it("truncates a sha256 to a readable prefix", () => {
    expect(
      shortHash(
        "375cd4d3480077e93dc0a3d1ab6a15a49144477600d024489c943a8fb561ad3",
      ),
    ).toBe("375cd4d3480…");
  });
});

describe("getFalloEjerciciosDescending", () => {
  it("orders ejercicios newest first regardless of input order, dropping none", () => {
    const fallos = loadFallos({
      ...fallosValid,
      records: [
        { ...fallosValid.records[0], ejercicio: "2022" },
        { ...fallosValid.records[0], ejercicio: "2024" },
        { ...fallosValid.records[0], ejercicio: "2023" },
      ],
    });
    expect(getFalloEjerciciosDescending(fallos)).toEqual([
      "2024",
      "2023",
      "2022",
    ]);
  });

  it("deduplicates repeated ejercicios (one entry per year, not per record)", () => {
    const fallos = loadFallos({
      ...fallosValid,
      records: [
        { ...fallosValid.records[0], ejercicio: "2023", official: "A" },
        { ...fallosValid.records[0], ejercicio: "2023", official: "B" },
      ],
    });
    expect(getFalloEjerciciosDescending(fallos)).toEqual(["2023"]);
  });
});

describe("selectFallosPreview (home dashboard preview, fidelity slice F2)", () => {
  it("keeps EVERY record of the most recent ejercicio (never drops a named official)", () => {
    const fallos = loadFallos({
      ...fallosValid,
      records: [
        { ...fallosValid.records[0], ejercicio: "2022", official: "A" },
        { ...fallosValid.records[0], ejercicio: "2024", official: "B" },
        { ...fallosValid.records[0], ejercicio: "2024", official: "C" },
      ],
    });
    const preview = selectFallosPreview(fallos);
    const officials2024 = preview
      .filter((record) => record.ejercicio === "2024")
      .map((record) => record.official);
    expect(officials2024).toEqual(["B", "C"]);
  });

  it("includes exactly one representative record for each OLDER ejercicio", () => {
    const fallos = loadFallos({
      ...fallosValid,
      records: [
        { ...fallosValid.records[0], ejercicio: "2023", official: "A" },
        { ...fallosValid.records[0], ejercicio: "2023", official: "B" },
        { ...fallosValid.records[0], ejercicio: "2022", official: "C" },
        { ...fallosValid.records[0], ejercicio: "2024", official: "D" },
      ],
    });
    const preview = selectFallosPreview(fallos);
    expect(
      preview.filter((record) => record.ejercicio === "2023"),
    ).toHaveLength(1);
    expect(
      preview.filter((record) => record.ejercicio === "2022"),
    ).toHaveLength(1);
  });

  it("never drops a whole ejercicio -- completeness at the ejercicio level (honesty guarantee)", () => {
    const { fallos } = { fallos: fallosValid };
    const loaded = loadFallos({
      ...fallos,
      records: [
        { ...fallos.records[0], ejercicio: "2022" },
        { ...fallos.records[0], ejercicio: "2023" },
        { ...fallos.records[0], ejercicio: "2024" },
      ],
    });
    const preview = selectFallosPreview(loaded);
    const previewEjercicios = new Set(preview.map((r) => r.ejercicio));
    expect(previewEjercicios).toEqual(new Set(["2022", "2023", "2024"]));
  });

  it("orders the preview newest ejercicio first, stable within an ejercicio", () => {
    const fallos = loadFallos({
      ...fallosValid,
      records: [
        { ...fallosValid.records[0], ejercicio: "2022", official: "A" },
        { ...fallosValid.records[0], ejercicio: "2024", official: "B" },
        { ...fallosValid.records[0], ejercicio: "2024", official: "C" },
        { ...fallosValid.records[0], ejercicio: "2023", official: "D" },
      ],
    });
    const preview = selectFallosPreview(fallos);
    expect(preview.map((r) => r.ejercicio)).toEqual([
      "2024",
      "2024",
      "2023",
      "2022",
    ]);
    // Stable within the 2024 group: B before C, same relative order as input.
    expect(preview.map((r) => r.official).slice(0, 2)).toEqual(["B", "C"]);
  });
});
