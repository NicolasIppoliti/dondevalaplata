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
  // Period-keyed, not positional: a series missing a middle period (e.g.
  // not-yet-published data for one municipio) must never shift another
  // series' values into the wrong row. Rows are the UNION of every
  // series' periods, so no series' data goes missing from the table
  // either.
  const periodSet = new Set<string>();
  for (const s of series) {
    for (const point of s.points) periodSet.add(point.period);
  }
  const periods = Array.from(periodSet).sort();
  const valuesByPeriod = series.map(
    (s) => new Map(s.points.map((point) => [point.period, point.value])),
  );

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
        {periods.map((period) => (
          <tr key={period} className="border-b border-slate-200">
            <th scope="row" className="py-1.5 pr-4 text-left font-normal">
              {formatPeriod(period)}
            </th>
            {series.map((s, seriesIndex) => {
              const value = valuesByPeriod[seriesIndex].get(period);
              return (
                <td key={s.id} className="py-1.5 pr-4 text-right tabular-nums">
                  {/* Explicit "no data" marker -- never a fabricated "0",
                      which would misrepresent an unpublished month as an
                      actual zero-value transfer. */}
                  {value === undefined ? "s/d" : formatValue(value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
