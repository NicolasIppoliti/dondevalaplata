import { describe, expect, it } from "vitest";
import coparticipacionValid from "./fixtures/coparticipacion.valid.json";
import poblacionCensoValid from "./fixtures/poblacion-censo.valid.json";
import { loadCoparticipacion, loadPoblacionCenso2022 } from "@/lib/data";
import { computePerCapitaSeries } from "@/lib/perCapita";

describe("computePerCapitaSeries (feature H3a, fair per-inhabitant comparison)", () => {
  it("divides each municipio's REAL (inflation-adjusted) series by its Censo 2022 population", () => {
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const poblacionCenso = loadPoblacionCenso2022(poblacionCensoValid);

    const series = computePerCapitaSeries(coparticipacion, poblacionCenso);

    const coronelRosales = series.find((s) => s.id === "06182");
    const sourceCoronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === "06182",
    );
    const poblacionCoronelRosales = poblacionCenso.municipios.find(
      (m) => m.municipioId === "06182",
    )?.poblacion;

    expect(coronelRosales).toBeDefined();
    expect(poblacionCoronelRosales).toBe(67503);
    for (const point of coronelRosales?.points ?? []) {
      const sourcePoint = sourceCoronelRosales?.points.find(
        (p) => p.period === point.period,
      );
      expect(point.value).toBeCloseTo(
        (sourcePoint?.realArs ?? 0) / (poblacionCoronelRosales ?? 1),
      );
    }
  });

  it("covers every municipio present in the coparticipacion series", () => {
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const poblacionCenso = loadPoblacionCenso2022(poblacionCensoValid);

    const series = computePerCapitaSeries(coparticipacion, poblacionCenso);

    expect(series.map((s) => s.id).sort()).toEqual(
      coparticipacion.series.map((s) => s.municipioId).sort(),
    );
  });

  it("uses the municipio label, not the raw id, so the table renders human-readable columns", () => {
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const poblacionCenso = loadPoblacionCenso2022(poblacionCensoValid);

    const series = computePerCapitaSeries(coparticipacion, poblacionCenso);

    const coronelRosales = series.find((s) => s.id === "06182");
    expect(coronelRosales?.label).toBe("Coronel Rosales");
  });

  it("throws a descriptive error when a coparticipacion municipioId has no Censo 2022 population record (never silently drops a municipio)", () => {
    const coparticipacion = loadCoparticipacion(coparticipacionValid);
    const poblacionCensoMissingOne = loadPoblacionCenso2022({
      ...poblacionCensoValid,
      municipios: poblacionCensoValid.municipios.filter(
        (m) => m.municipioId !== "06182",
      ),
    });

    expect(() =>
      computePerCapitaSeries(coparticipacion, poblacionCensoMissingOne),
    ).toThrow(/06182/);
  });
});
