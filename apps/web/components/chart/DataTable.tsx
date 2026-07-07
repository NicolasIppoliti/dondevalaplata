import type { ChartSeriesData } from "./types";

/**
 * Mandatory accessible companion to `SvgChart` (design D7) — the actual
 * source of truth for screen-reader users and anyone who prefers exact
 * figures over a visual trend line. Every adjusted-figure disclosure lives
 * in the caller's surrounding markup, not here.
 */

interface DataTableProps {
  caption: string;
  series: ChartSeriesData[];
  formatValue?: (value: number) => string;
  formatPeriod?: (period: string) => string;
  periodColumnLabel?: string;
}

export function DataTable({
  caption,
  series,
  formatValue = (value) => String(value),
  formatPeriod = (period) => period,
  periodColumnLabel = "Período",
}: DataTableProps) {
  const periods = series[0]?.points.map((point) => point.period) ?? [];

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-2 text-left text-sm text-slate-600">
        {caption}
      </caption>
      <thead>
        <tr className="border-b border-slate-300">
          <th scope="col" className="py-2 pr-4 text-left font-semibold">
            {periodColumnLabel}
          </th>
          {series.map((s) => (
            <th
              key={s.id}
              scope="col"
              className="py-2 pr-4 text-right font-semibold"
            >
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((period, rowIndex) => (
          <tr key={period} className="border-b border-slate-200">
            <th scope="row" className="py-1.5 pr-4 text-left font-normal">
              {formatPeriod(period)}
            </th>
            {series.map((s) => (
              <td key={s.id} className="py-1.5 pr-4 text-right tabular-nums">
                {formatValue(s.points[rowIndex]?.value ?? 0)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
