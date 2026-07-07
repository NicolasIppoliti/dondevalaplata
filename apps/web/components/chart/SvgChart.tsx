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

const DEFAULT_VIEW_WIDTH = 640;
const DEFAULT_VIEW_HEIGHT = 320;
const BASE_PADDING = { top: 24, right: 16, bottom: 32, left: 16 };
const DEFAULT_GRID_LINE_COUNT = 3;
// Y-axis tick labels ("$ 2.380 millones") are right-aligned into a left
// gutter whose width must grow with the label text, or long labels get
// clipped by the viewBox's left edge (only the tail -- e.g. "es" from
// "millones" -- survives). ~0.62em is a safe advance-width estimate for
// the mono typeface at AXIS_LABEL_FONT_SIZE; AXIS_LABEL_GAP mirrors the
// existing 6px text-to-rule offset used when positioning the label.
const AXIS_LABEL_FONT_SIZE = 11;
const AXIS_LABEL_CHAR_WIDTH = AXIS_LABEL_FONT_SIZE * 0.62;
const AXIS_LABEL_GAP = 8;
// Default end-of-line label offset (existing behavior, unchanged for every
// caller that doesn't set `fillHeight`): 12px straight above the last
// point, right edge flush with the point's x.
const LAST_POINT_LABEL_OFFSET_Y = 12;
// Hero-only (fillHeight) end-of-line label offset: the hero chart is a
// single, prominent series where a steep final segment (a big month-to-
// month jump) can bring the line close enough to the default 12px offset
// that the bold value label visually sits on top of the stroke. Nudging
// the anchor up-and-right reads as clearly "above and beside" the point
// instead. The rightward nudge is intentionally smaller than
// `BASE_PADDING.right` (16px) so, combined with the unchanged
// `textAnchor="end"` (text still extends LEFTWARD from the anchor), the
// label can never cross the viewBox's right edge at any viewBoxWidth --
// no extra clamping needed. The toggle ("ver también sin ajustar") chart
// also sets `showLastPointLabel` but never `fillHeight`, so it keeps the
// original offset untouched.
const HERO_LAST_POINT_LABEL_OFFSET_X = 8;
const HERO_LAST_POINT_LABEL_OFFSET_Y = 26;

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
  /**
   * Shows the series-name legend below the chart. Defaults to `true`
   * (existing behavior). The hero chart on /coparticipacion turns this off
   * when it shows a single series with `showLastPointLabel` instead --
   * a direct end-of-line value already identifies the line, a separate
   * solid/dashed legend would be redundant chrome for a one-line chart.
   */
  showLegend?: boolean;
  /** Number of horizontal gridlines/ticks. Defaults to 3 (existing behavior). */
  gridLineCount?: number;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  /** Tailwind classes controlling the rendered `<svg>` box size. Defaults
   * to the existing `"h-auto w-full"` (height follows the viewBox aspect
   * ratio). The hero chart overrides this to a fixed/viewport-relative
   * height so it reads as genuinely BIG on a phone screen. */
  heightClassName?: string;
  /** Optional short caption above the chart naming the value's unit, e.g.
   * "Montos en pesos, ajustados por inflación (IPC INDEC)". */
  axisUnitLabel?: string;
  /**
   * Opt-in layout mode for callers that wrap `<SvgChart>` in an explicitly
   * sized (bounded-height) container -- e.g. the `/coparticipacion` hero
   * chart's `h-[50vh] ... sm:h-[420px]` box. Off by default so every
   * existing caller (which relies on the `<svg>`'s own intrinsic
   * viewBox aspect ratio via `h-auto`) renders byte-for-byte unchanged.
   *
   * When `true`, this component becomes a column flexbox that actually
   * fills its parent's height (`flex h-full flex-col`) and the `<svg>`
   * becomes a `flex-1 min-h-0` flex item instead of sizing itself from
   * the viewBox aspect ratio. Without this, an unstyled wrapper `<div>`
   * with `height: auto` sits between the sized container and the `<svg>`,
   * which breaks the CSS percentage-height chain (`h-full` on the `<svg>`
   * has no definite containing-block height to resolve against) and the
   * `<svg>` falls back to sizing its height from `width * (viewBox
   * aspect ratio)` instead -- producing an unbounded height that grows
   * with viewport width (the "vertical blowout on wide viewports" bug).
   */
  fillHeight?: boolean;
}

export function SvgChart({
  series,
  ariaLabel,
  formatValue = (value) => String(value),
  formatPeriod = (period) => period,
  showLastPointLabel = false,
  showLegend = true,
  gridLineCount = DEFAULT_GRID_LINE_COUNT,
  viewBoxWidth = DEFAULT_VIEW_WIDTH,
  viewBoxHeight = DEFAULT_VIEW_HEIGHT,
  heightClassName = "h-auto w-full",
  axisUnitLabel,
  fillHeight = false,
}: SvgChartProps) {
  const VIEW_WIDTH = viewBoxWidth;
  const VIEW_HEIGHT = viewBoxHeight;
  const GRID_LINE_COUNT = Math.max(2, gridLineCount);
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

  // Compute gridline VALUES first (only depends on min/max/count, not on
  // padding) so their formatted label widths can size the left gutter
  // before PADDING.left -- and everything derived from it -- is fixed.
  const gridLineValues = Array.from(
    { length: GRID_LINE_COUNT },
    (_, i) => minValue + (valueRange * i) / (GRID_LINE_COUNT - 1),
  );
  const longestLabelLength = gridLineValues.reduce(
    (max, value) => Math.max(max, formatValue(value).length),
    0,
  );
  const PADDING = {
    ...BASE_PADDING,
    left: Math.max(
      BASE_PADDING.left,
      Math.ceil(longestLabelLength * AXIS_LABEL_CHAR_WIDTH) + AXIS_LABEL_GAP,
    ),
  };

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number): number =>
    periods.length <= 1
      ? PADDING.left
      : PADDING.left + (index / (periods.length - 1)) * innerWidth;

  const yForValue = (value: number): number =>
    PADDING.top + innerHeight - ((value - minValue) / valueRange) * innerHeight;

  const gridLines = gridLineValues.map((value) => ({
    value,
    y: round(yForValue(value)),
  }));

  const primarySeries = series[0];
  const lastPoint = primarySeries?.points.at(-1);
  const lastPointCoords =
    showLastPointLabel && lastPoint
      ? (() => {
          const index = periodIndex.get(lastPoint.period);
          return index === undefined
            ? null
            : {
                x: round(xForIndex(index)),
                y: round(yForValue(lastPoint.value)),
              };
        })()
      : null;

  return (
    <div className={fillHeight ? "flex h-full w-full flex-col" : undefined}>
      {axisUnitLabel ? (
        <p
          className={`mb-1 font-mono text-[11px] text-muted ${fillHeight ? "shrink-0" : ""}`}
        >
          {axisUnitLabel}
        </p>
      ) : null}
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className={
          fillHeight ? `${heightClassName} min-h-0 flex-1` : heightClassName
        }
        preserveAspectRatio="xMidYMid meet"
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
              fontSize={AXIS_LABEL_FONT_SIZE}
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
              x={
                fillHeight
                  ? lastPointCoords.x + HERO_LAST_POINT_LABEL_OFFSET_X
                  : lastPointCoords.x
              }
              y={
                fillHeight
                  ? lastPointCoords.y - HERO_LAST_POINT_LABEL_OFFSET_Y
                  : lastPointCoords.y - LAST_POINT_LABEL_OFFSET_Y
              }
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
      {showLegend ? (
        <ul
          className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[13px] text-muted ${fillHeight ? "shrink-0" : ""}`}
        >
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
                  strokeDasharray={
                    DASH_PATTERNS[seriesIndex % DASH_PATTERNS.length]
                  }
                />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
