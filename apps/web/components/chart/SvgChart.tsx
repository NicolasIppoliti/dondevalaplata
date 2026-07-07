import type { ChartSeriesData } from "./types";

/**
 * Server-rendered, zero-client-JS SVG line chart. Distinguishes series by
 * BOTH stroke width and dash pattern (not color alone) so the figure stays
 * legible in grayscale print and for colorblind readers. This is a visual
 * companion only — `DataTable` next to it is the accessible source of truth
 * (design D7).
 *
 * Styling follows DESIGN.md's canonical chart component: the primary
 * (real/constant) series is a solid 3px `--olive` line, a secondary
 * (nominal) series is a dashed 1.5px `--muted` line, the grid is dashed
 * `--rule`, and labels are mono. `showLastPointLabel` is opt-in (default
 * off) so existing callers/tests that don't pass it keep the exact same
 * markup.
 */

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const PADDING = { top: 24, right: 16, bottom: 32, left: 16 };
const GRID_LINE_COUNT = 3;

// Design-token colors, referenced as CSS custom properties. Kept as plain
// constants because <stroke>/<fill> are SVG attributes, not classNames --
// the documented escape hatch for library/graphics props that can't take
// Tailwind classes -- but modern browsers resolve `var(--token)` in SVG
// presentation attributes exactly like in regular CSS.
const STROKE_TONES = [
  "var(--color-olive)",
  "var(--color-muted)",
  "var(--color-ink)",
  "var(--color-stamp)",
] as const;
const DASH_PATTERNS = ["", "6 4", "2 4", "10 3 2 3"] as const;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

interface SvgChartProps {
  series: ChartSeriesData[];
  ariaLabel: string;
  formatValue?: (value: number) => string;
  formatPeriod?: (period: string) => string;
  /** Marks and labels the last point of the primary (first) series. */
  showLastPointLabel?: boolean;
}

export function SvgChart({
  series,
  ariaLabel,
  formatValue = (value) => String(value),
  formatPeriod = (period) => period,
  showLastPointLabel = false,
}: SvgChartProps) {
  // Period-keyed, not positional: the canonical x-axis is the UNION of
  // every series' periods, and each series' own points are placed at
  // THEIR period's index in that canonical list -- never at their
  // position within that series' own (possibly shorter) points array.
  // Otherwise a series missing a middle period would have every later
  // point compressed one slot to the left.
  const periodSet = new Set<string>();
  for (const s of series) {
    for (const point of s.points) periodSet.add(point.period);
  }
  const periods = Array.from(periodSet).sort();
  const periodIndex = new Map(periods.map((period, index) => [period, index]));
  const allValues = series.flatMap((s) => s.points.map((point) => point.value));
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const valueRange = maxValue - minValue || 1;

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number): number =>
    periods.length <= 1
      ? PADDING.left
      : PADDING.left + (index / (periods.length - 1)) * innerWidth;

  const yForValue = (value: number): number =>
    PADDING.top + innerHeight - ((value - minValue) / valueRange) * innerHeight;

  const gridLines = Array.from({ length: GRID_LINE_COUNT }, (_, i) => {
    const value = minValue + (valueRange * i) / (GRID_LINE_COUNT - 1);
    return { value, y: round(yForValue(value)) };
  });

  const primarySeries = series[0];
  const lastPoint = primarySeries?.points.at(-1);
  const lastPointCoords =
    showLastPointLabel && lastPoint
      ? (() => {
          const index = periodIndex.get(lastPoint.period);
          return index === undefined
            ? null
            : { x: round(xForIndex(index)), y: round(yForValue(lastPoint.value)) };
        })()
      : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
      >
        {gridLines.map((line, i) => (
          <g key={line.value}>
            <line
              x1={PADDING.left}
              y1={line.y}
              x2={VIEW_WIDTH - PADDING.right}
              y2={line.y}
              stroke="var(--color-rule)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : "3 4"}
            />
            <text
              x={PADDING.left - 6}
              y={line.y - 3}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
              className="font-mono"
            >
              {formatValue(line.value)}
            </text>
          </g>
        ))}
        {series.map((s, seriesIndex) => (
          <polyline
            key={s.id}
            fill="none"
            stroke={STROKE_TONES[seriesIndex % STROKE_TONES.length]}
            strokeWidth={seriesIndex === 0 ? 3 : 1.5}
            strokeDasharray={DASH_PATTERNS[seriesIndex % DASH_PATTERNS.length]}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points
              // A period this series has no point for is simply skipped --
              // never fabricated as a zero-value plot point.
              .map((point) => {
                const index = periodIndex.get(point.period);
                return index === undefined
                  ? null
                  : `${round(xForIndex(index))},${round(yForValue(point.value))}`;
              })
              .filter((coord): coord is string => coord !== null)
              .join(" ")}
          />
        ))}
        {lastPointCoords ? (
          <g>
            <circle
              cx={lastPointCoords.x}
              cy={lastPointCoords.y}
              r={5}
              fill="var(--color-olive)"
            />
            <text
              x={lastPointCoords.x}
              y={lastPointCoords.y - 12}
              textAnchor="end"
              fontSize={13}
              fontWeight={600}
              fill="var(--color-ink)"
              className="font-mono"
            >
              {formatValue(lastPoint!.value)}
            </text>
          </g>
        ) : null}
        <text
          x={PADDING.left}
          y={VIEW_HEIGHT - 4}
          fontSize={11}
          fill="var(--color-muted)"
          className="font-mono"
        >
          {periods[0] ? formatPeriod(periods[0]) : ""}
        </text>
        <text
          x={VIEW_WIDTH - PADDING.right}
          y={VIEW_HEIGHT - 4}
          fontSize={11}
          fill="var(--color-muted)"
          textAnchor="end"
          className="font-mono"
        >
          {periods[periods.length - 1]
            ? formatPeriod(periods[periods.length - 1])
            : ""}
        </text>
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[13px] text-muted">
        {series.map((s, seriesIndex) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg width={24} height={10} aria-hidden="true">
              <line
                x1={0}
                y1={5}
                x2={24}
                y2={5}
                stroke={STROKE_TONES[seriesIndex % STROKE_TONES.length]}
                strokeWidth={seriesIndex === 0 ? 3 : 1.5}
                strokeDasharray={DASH_PATTERNS[seriesIndex % DASH_PATTERNS.length]}
              />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
