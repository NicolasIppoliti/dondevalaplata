/**
 * Pure geometry/interaction helpers for the interactive coparticipación
 * chart (`components/chart/InteractiveCoparticipacionChart.tsx`, client
 * island). Kept side-effect-free so the period-keyed indexing invariant,
 * MoM delta arithmetic and reference-year average can be unit-tested
 * without touching the DOM or simulating pointer events.
 */

export interface ChartPointInput {
  period: string;
  value: number;
}

export interface ChartCoord {
  period: string;
  value: number;
  x: number;
  y: number;
}

export interface ChartGridLine {
  value: number;
  y: number;
}

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartLayout {
  periods: string[];
  coords: ChartCoord[];
  gridLines: ChartGridLine[];
  padding: ChartPadding;
  innerWidth: number;
  innerHeight: number;
  /**
   * Same value->y scale used to plot `coords`/`gridLines`, exposed so a
   * caller can place an auxiliary line (e.g. the interactive chart's
   * dashed "Promedio {year}" reference line) at a value that isn't one of
   * the series' own points, without duplicating the scale's min/max/range
   * math.
   */
  scaleValueToY: (value: number) => number;
}

const DEFAULT_PADDING: ChartPadding = { top: 24, right: 16, bottom: 32, left: 16 };
const DEFAULT_GRID_LINE_COUNT = 4;

/**
 * Builds pixel (viewBox-unit) coordinates for a single series, keyed by
 * PERIOD -- never by the point's raw position in the input array. Points
 * are sorted by period ascending before any coordinate is computed, so a
 * caller passing scrambled or out-of-order data still renders a correct
 * left-to-right timeline (the same bug class `SvgChart`'s period-keyed
 * indexing test guards against).
 */
export function computeChartLayout(params: {
  points: ChartPointInput[];
  viewBoxWidth: number;
  viewBoxHeight: number;
  gridLineCount?: number;
  padding?: Partial<ChartPadding>;
}): ChartLayout {
  const {
    points,
    viewBoxWidth,
    viewBoxHeight,
    gridLineCount = DEFAULT_GRID_LINE_COUNT,
    padding: paddingOverride,
  } = params;

  const padding: ChartPadding = { ...DEFAULT_PADDING, ...paddingOverride };
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const periods = sorted.map((p) => p.period);

  const innerWidth = viewBoxWidth - padding.left - padding.right;
  const innerHeight = viewBoxHeight - padding.top - padding.bottom;

  const values = sorted.map((p) => p.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const valueRange = maxValue - minValue || 1;

  const xForIndex = (index: number): number =>
    sorted.length <= 1
      ? padding.left
      : padding.left + (index / (sorted.length - 1)) * innerWidth;

  const yForValue = (value: number): number =>
    padding.top + innerHeight - ((value - minValue) / valueRange) * innerHeight;

  const coords: ChartCoord[] = sorted.map((point, index) => ({
    period: point.period,
    value: point.value,
    x: xForIndex(index),
    y: yForValue(point.value),
  }));

  const count = Math.max(2, gridLineCount);
  const gridLines: ChartGridLine[] = Array.from({ length: count }, (_, i) => {
    const value = minValue + (valueRange * i) / (count - 1);
    return { value, y: yForValue(value) };
  });

  return {
    periods,
    coords,
    gridLines,
    padding,
    innerWidth,
    innerHeight,
    scaleValueToY: yForValue,
  };
}

export type MomDirection = "up" | "down" | "flat";

export interface MomDelta {
  direction: MomDirection;
  /** Fraction (e.g. `0.032` = +3.2%). `null` for the series' first point. */
  fraction: number | null;
}

// A tighter band than `lib/insight.ts`'s +/-5% editorial band on purpose:
// this flags genuinely near-zero month-over-month noise in the tooltip's
// arithmetic delta, not a "should we call this a trend" judgment.
const MOM_FLAT_EPSILON_FRACTION = 0.0005;

/**
 * Real (non-fabricated) month-over-month arithmetic variation for the
 * point at `index` within a chronologically-sorted `values` array. The
 * first point has no prior month to compare against, so it is always
 * `{ direction: "flat", fraction: null }` -- never a fabricated "0%" or an
 * arrow the data doesn't support.
 */
export function computeMomDelta(values: number[], index: number): MomDelta {
  if (index <= 0) return { direction: "flat", fraction: null };
  const previous = values[index - 1];
  const current = values[index];
  if (previous === 0) return { direction: "flat", fraction: null };
  const fraction = (current - previous) / previous;
  if (Math.abs(fraction) < MOM_FLAT_EPSILON_FRACTION) {
    return { direction: "flat", fraction };
  }
  return { direction: fraction > 0 ? "up" : "down", fraction };
}

const FULL_CALENDAR_YEAR_POINT_COUNT = 12;

/**
 * Average value of the earliest FULL (12-point) calendar year present,
 * falling back to the earliest available calendar year (however many
 * points it has) when no year is full -- same fallback rule as
 * `lib/insight.ts`'s trend computation, generalized to a plain
 * `{period,value}[]` series so it can back either the real or nominal
 * mode of the interactive chart's dashed reference line.
 */
export function computeReferenceYearAverage(
  points: ChartPointInput[],
): { year: string; average: number } | null {
  const byYear = new Map<string, ChartPointInput[]>();
  for (const point of points) {
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
    referenceYearPoints.reduce((sum, point) => sum + point.value, 0) /
    referenceYearPoints.length;
  return { year: referenceYear, average };
}

/**
 * Pointer/keyboard hit-testing: which chart index is closest to a given
 * x (in the same viewBox units as `computeChartLayout`'s coords), clamped
 * to the series' own range so a drag past either edge lands on the first
 * or last point instead of resolving to nothing.
 */
export function nearestPeriodIndex(
  coords: { x: number }[],
  targetX: number,
): number {
  if (coords.length === 0) return -1;
  let closestIndex = 0;
  let closestDistance = Math.abs(coords[0].x - targetX);
  for (let i = 1; i < coords.length; i += 1) {
    const distance = Math.abs(coords[i].x - targetX);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }
  return closestIndex;
}
