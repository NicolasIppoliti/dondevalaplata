import type { ChartSeriesData } from "@/components/chart/types";
import type { CoparticipacionData, PoblacionCensoData } from "./schemas";

/**
 * Derives the "$ por habitante" per-cápita comparison (feature H3a): each
 * municipio's REAL (inflation-adjusted) coparticipación series divided by
 * its Censo 2022 population -- the fair, honest way to compare municipios
 * of very different size (Bahía Blanca has several times more inhabitants
 * than Coronel Rosales, so comparing absolute pesos alone is misleading;
 * see DESIGN.md's decision log entry for D8/H3).
 *
 * Population is a single point-in-time constant per municipio (the census
 * has no monthly series), so every period of a municipio's series divides
 * by the SAME population figure -- only the numerator (coparticipación)
 * varies over time.
 *
 * Throws if a coparticipación series references a `municipioId` with no
 * matching Censo 2022 population record, per this portal's "never
 * silently drop a municipio" doctrine (same failure-loud pattern as
 * `resolveSourceRef`) -- a per-cápita comparison missing one municipio
 * without saying so would be a worse honesty failure than not shipping it
 * at all.
 */
export function computePerCapitaSeries(
  coparticipacion: CoparticipacionData,
  poblacionCenso: PoblacionCensoData,
): ChartSeriesData[] {
  const poblacionByMunicipio = new Map(
    poblacionCenso.municipios.map((m) => [m.municipioId, m.poblacion]),
  );
  return coparticipacion.series.map((series) => {
    const poblacion = poblacionByMunicipio.get(series.municipioId);
    if (poblacion === undefined) {
      throw new Error(
        `per-capita build invariant failed: municipioId "${series.municipioId}" ` +
          "has no Censo 2022 population record in data/poblacion-censo-2022.json",
      );
    }
    return {
      id: series.municipioId,
      label: series.municipio,
      points: series.points.map((point) => ({
        period: point.period,
        value: point.realArs / poblacion,
      })),
    };
  });
}
