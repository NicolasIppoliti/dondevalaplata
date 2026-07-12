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
  /**
   * Colors each value by its arithmetic sign vs. the SAME series' previous
   * period (olive = non-negative, stamp = negative) — a real variation of
   * a real series, never a political judgment (DESIGN.md's chromatic
   * neutrality rule). Off by default so existing callers keep plain ink
   * numbers. When on, a negative cell ALSO gets a neutral "▼ " marker (not
   * color alone -- WCAG 1.4.1 use-of-color) and the table renders a single
   * factual legend line below itself ("En rojo: cayó respecto del mes
   * anterior."), never an evaluative one.
   */
  colorizeBySign?: boolean;
  /**
   * Optional exact-precision formatter. When given, each value cell's
   * rounded `formatValue` text is wrapped in a `title` attribute carrying
   * the full-precision figure, so a hover/long-press reveals the exact
   * amount behind a human-rounded table value.
   */
  formatFullPrecision?: (value: number) => string;
}

export function DataTable({
  caption,
  series,
  formatValue = (value) => String(value),
  formatPeriod = (period) => period,
  periodColumnLabel = "Período",
  colorizeBySign = false,
  formatFullPrecision,
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
    <>
      <table className="w-full border-collapse text-[15px]">
        <caption className="mb-2 text-left font-mono text-xs tracking-[0.1em] text-muted uppercase">
          {caption}
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
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
          {periods.map((period, periodIndex) => (
            <tr key={period} className="border-b border-rule">
              <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                {formatPeriod(period)}
              </th>
              {series.map((s, seriesIndex) => {
                const value = valuesByPeriod[seriesIndex].get(period);
                let signClass = "";
                let fell = false;
                if (colorizeBySign && value !== undefined && periodIndex > 0) {
                  const previousPeriod = periods[periodIndex - 1];
                  const previousValue =
                    valuesByPeriod[seriesIndex].get(previousPeriod);
                  if (previousValue !== undefined) {
                    fell = value < previousValue;
                    signClass = fell ? "text-stamp" : "text-olive";
                  }
                }
                const displayText =
                  value === undefined ? "s/d" : formatValue(value);
                const title =
                  value !== undefined && formatFullPrecision
                    ? formatFullPrecision(value)
                    : undefined;
                return (
                  <td
                    key={s.id}
                    className={`py-1.5 pr-4 text-right font-mono tabular-nums whitespace-nowrap ${signClass}`}
                  >
                    {/* Explicit "no data" marker -- never a fabricated "0",
                      which would misrepresent an unpublished month as an
                      actual zero-value transfer. */}
                    <span title={title}>
                      {/* A "▼ " marker -- not color alone -- flags a drop vs.
                        the previous period (WCAG 1.4.1 use-of-color); the
                        legend below spells out exactly what it means. */}
                      {fell ? "▼ " : ""}
                      {displayText}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {colorizeBySign ? (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          En rojo: cayó respecto del mes anterior.
        </p>
      ) : null}
    </>
  );
}
