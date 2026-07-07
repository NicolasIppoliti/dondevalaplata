import { formatVariationEsAr } from "./format";
import type { CoparticipacionPoint } from "./schemas";

/**
 * Derives the honest, plain-language real-terms trend for a coparticipación
 * series (coparticipacion-conclusion capability). This is the ONLY place
 * that decides whether the /coparticipacion page's leading conclusion
 * sentence says "sube", "cae" or "está estancado" -- the page itself never
 * hardcodes a direction. Two independent signals are computed and a wide
 * neutral band is used so a small, noisy month-to-month wobble never gets
 * dressed up as a real trend:
 *
 *  1. `yoyFraction` -- the latest point vs. the SAME calendar month one
 *     year earlier (the standard way to strip seasonality from a monthly
 *     series). `null` when the series has no such point.
 *  2. `earliestYearAverageFraction` -- the latest point vs. the average of
 *     the earliest FULL (12-point) calendar year present, falling back to
 *     the earliest calendar year present at all (however many points it
 *     has) when no year is full. This is what drives the verdict when
 *     `yoyFraction` is unavailable (e.g. a series younger than a year),
 *     and is always computed as a secondary corroborating signal
 *     otherwise.
 *
 * `yoyFraction` is preferred as the primary signal (it isolates seasonality
 * best); `earliestYearAverageFraction` is the fallback when no same-month
 * prior-year point exists at all.
 */

export type CoparticipacionTrendDirection = "up" | "flat" | "down";

export interface CoparticipacionTrend {
  direction: CoparticipacionTrendDirection;
  /** Fraction (e.g. `0.03` = +3%), never a already-multiplied percent. */
  yoyFraction: number | null;
  earliestYearAverageFraction: number | null;
  /** Calendar year `earliestYearAverageFraction` is computed against. */
  earliestReferenceYear: string | null;
  /** Plain-language es-AR sentence for the page's leading conclusion. */
  message: string;
}

// +/-5%: inside this band the honest verdict is "flat" -- a real series
// wobbles month to month, and dressing up a 2% move as "sube" or "cae"
// would be an unsupported claim the data doesn't back.
const NEUTRAL_BAND_FRACTION = 0.05;
const FULL_CALENDAR_YEAR_POINT_COUNT = 12;

function priorYearPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${Number(year) - 1}-${month}`;
}

function classify(fraction: number): CoparticipacionTrendDirection {
  if (fraction > NEUTRAL_BAND_FRACTION) return "up";
  if (fraction < -NEUTRAL_BAND_FRACTION) return "down";
  return "flat";
}

function computeEarliestYearAverage(
  sortedPoints: CoparticipacionPoint[],
): { year: string; average: number } | null {
  const byYear = new Map<string, CoparticipacionPoint[]>();
  for (const point of sortedPoints) {
    const year = point.period.slice(0, 4);
    const bucket = byYear.get(year) ?? [];
    bucket.push(point);
    byYear.set(year, bucket);
  }
  const years = [...byYear.keys()].sort();
  if (years.length === 0) return null;

  const fullYear = years.find(
    (year) => byYear.get(year)!.length === FULL_CALENDAR_YEAR_POINT_COUNT,
  );
  const referenceYear = fullYear ?? years[0];
  const referenceYearPoints = byYear.get(referenceYear)!;
  const average =
    referenceYearPoints.reduce((sum, point) => sum + point.realArs, 0) /
    referenceYearPoints.length;
  return { year: referenceYear, average };
}

function buildMessage(
  direction: CoparticipacionTrendDirection,
  info: {
    yoyFraction: number | null;
    earliestYearAverageFraction: number | null;
    earliestReferenceYear: string | null;
  },
): string {
  const primaryFraction = info.yoyFraction ?? info.earliestYearAverageFraction;
  const comparisonLabel =
    info.yoyFraction !== null
      ? "que en el mismo mes del año pasado"
      : info.earliestReferenceYear
        ? `que el promedio de ${info.earliestReferenceYear}`
        : "que antes";

  if (direction === "up") {
    const percent =
      primaryFraction !== null ? `${formatVariationEsAr(primaryFraction)} ` : "";
    return `En plata de hoy, lo que recibe Coronel Rosales está subiendo: ${percent}${comparisonLabel}.`;
  }
  if (direction === "down") {
    const percent =
      primaryFraction !== null ? `${formatVariationEsAr(primaryFraction)} ` : "";
    return `En plata de hoy, lo que recibe Coronel Rosales está cayendo: ${percent}${comparisonLabel}.`;
  }
  const sinceClause = info.earliestReferenceYear
    ? ` desde ${info.earliestReferenceYear}`
    : "";
  return `En plata de hoy, lo que llega está estancado${sinceClause}, aunque el número nominal suene cada vez más grande.`;
}

export function computeCoparticipacionTrend(
  points: CoparticipacionPoint[],
): CoparticipacionTrend {
  if (points.length === 0) {
    return {
      direction: "flat",
      yoyFraction: null,
      earliestYearAverageFraction: null,
      earliestReferenceYear: null,
      message:
        "Todavía no hay datos suficientes para mostrar una tendencia real confiable.",
    };
  }

  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted[sorted.length - 1];

  const priorYearPoint = sorted.find(
    (point) => point.period === priorYearPeriod(latest.period),
  );
  const yoyFraction =
    priorYearPoint && priorYearPoint.realArs !== 0
      ? (latest.realArs - priorYearPoint.realArs) / priorYearPoint.realArs
      : null;

  const earliestYearAverage = computeEarliestYearAverage(sorted);
  const earliestYearAverageFraction =
    earliestYearAverage && earliestYearAverage.average !== 0
      ? (latest.realArs - earliestYearAverage.average) /
        earliestYearAverage.average
      : null;
  const earliestReferenceYear = earliestYearAverage?.year ?? null;

  const primaryFraction = yoyFraction ?? earliestYearAverageFraction ?? 0;
  const direction = classify(primaryFraction);

  const message = buildMessage(direction, {
    yoyFraction,
    earliestYearAverageFraction,
    earliestReferenceYear,
  });

  return {
    direction,
    yoyFraction,
    earliestYearAverageFraction,
    earliestReferenceYear,
    message,
  };
}
