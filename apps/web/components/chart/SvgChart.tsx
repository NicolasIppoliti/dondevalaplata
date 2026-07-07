import type { ChartSeriesData } from "./types";

/**
 * Server-rendered, zero-client-JS SVG line chart. Distinguishes series by
 * BOTH stroke width and dash pattern (not color alone) so the figure stays
 * legible in grayscale print and for colorblind readers. This is a visual
 * companion only — `DataTable` next to it is the accessible source of truth
 * (design D7).
 */

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 32, left: 16 };

// Sober, civic-neutral ink tones (Tailwind slate scale). Kept as plain
// constants because <stroke> is an SVG attribute, not a className — the
// documented escape hatch for library/graphics props that can't take
// Tailwind classes.
const STROKE_TONES = ["#0f172a", "#475569", "#94a3b8", "#1e293b"] as const;
const DASH_PATTERNS = ["", "8 4", "2 4", "10 3 2 3"] as const;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

interface SvgChartProps {
  series: ChartSeriesData[];
  ariaLabel: string;
  formatValue?: (value: number) => string;
  formatPeriod?: (period: string) => string;
}

export function SvgChart({
  series,
  ariaLabel,
  formatValue = (value) => String(value),
  formatPeriod = (period) => period,
}: SvgChartProps) {
  const periods = series[0]?.points.map((point) => point.period) ?? [];
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

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + innerHeight}
          x2={VIEW_WIDTH - PADDING.right}
          y2={PADDING.top + innerHeight}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {series.map((s, seriesIndex) => (
          <polyline
            key={s.id}
            fill="none"
            stroke={STROKE_TONES[seriesIndex % STROKE_TONES.length]}
            strokeWidth={seriesIndex === 0 ? 2.5 : 1.5}
            strokeDasharray={DASH_PATTERNS[seriesIndex % DASH_PATTERNS.length]}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points
              .map(
                (point, index) =>
                  `${round(xForIndex(index))},${round(yForValue(point.value))}`,
              )
              .join(" ")}
          />
        ))}
        <text
          x={PADDING.left}
          y={PADDING.top}
          fontSize={11}
          fill="#334155"
        >
          {formatValue(maxValue)}
        </text>
        <text
          x={PADDING.left}
          y={VIEW_HEIGHT - 4}
          fontSize={11}
          fill="#334155"
        >
          {periods[0] ? formatPeriod(periods[0]) : ""}
        </text>
        <text
          x={VIEW_WIDTH - PADDING.right}
          y={VIEW_HEIGHT - 4}
          fontSize={11}
          fill="#334155"
          textAnchor="end"
        >
          {periods[periods.length - 1]
            ? formatPeriod(periods[periods.length - 1])
            : ""}
        </text>
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
        {series.map((s, seriesIndex) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg width={24} height={10} aria-hidden="true">
              <line
                x1={0}
                y1={5}
                x2={24}
                y2={5}
                stroke={STROKE_TONES[seriesIndex % STROKE_TONES.length]}
                strokeWidth={seriesIndex === 0 ? 2.5 : 1.5}
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
