import type { DeudaHistoricaPoint } from "@/lib/schemas";

/**
 * Pure helpers for the deuda pública histórica chart (feature H2a,
 * `components/deuda-historica/DeudaHistoricaChart.tsx`). Kept side-effect
 * free -- `listMissingQuarterLabels` never reads `Date.now()`; the number
 * of missing quarters always comes from the already-computed
 * `data/cadencia.json` (`cadencia.deuda.quartersMissing`, itself derived
 * at ETL build time), so this stays safe for static prerender.
 */

const QUARTER_ORDINAL_ES_AR = ["1er", "2do", "3er", "4to"] as const;

/**
 * Lists the `count` quarter labels immediately AFTER the quarter that
 * closed on `lastPeriodEndIso` (an ISO "YYYY-MM-DD" quarter-end date), in
 * order -- e.g. `("2025-09-30", 3)` -> `["4to trimestre 2025", "1er
 * trimestre 2026", "2do trimestre 2026"]`. Used to name the specific
 * missing quarters on the "acá dejaron de publicar" marker, rather than
 * just a bare count.
 */
export function listMissingQuarterLabels(
  lastPeriodEndIso: string,
  count: number,
): string[] {
  const [yearStr, monthStr] = lastPeriodEndIso.split("-");
  let year = Number(yearStr);
  // Quarter-end months are 03/06/09/12 -> quarter index 0..3.
  let quarterIndex = Math.floor((Number(monthStr) - 1) / 3);

  const labels: string[] = [];
  for (let i = 0; i < count; i += 1) {
    quarterIndex += 1;
    if (quarterIndex > 3) {
      quarterIndex = 0;
      year += 1;
    }
    labels.push(`${QUARTER_ORDINAL_ES_AR[quarterIndex]} trimestre ${year}`);
  }
  return labels;
}

/**
 * Returns the `period` keys flagged as a statistical anomaly
 * (`point.anomaly?.flagged`) -- e.g. Q4-2025's debt figure, a
 * VERIFIED-CORRECT extraction of the municipality's own published PDF that
 * is nonetheless ~39x its neighboring quarters (see
 * `data/deuda-historica.json`). Used to tell `SvgChart` which points to
 * exclude from the y-axis domain and render clamped with an explicit
 * "off-scale" marker, instead of either compressing every other point flat
 * or silently dropping a real, faithfully-sourced figure.
 */
export function getAnomalousPeriods(
  series: readonly Pick<DeudaHistoricaPoint, "period" | "anomaly">[],
): Set<string> {
  return new Set(
    series.filter((point) => point.anomaly?.flagged).map((point) => point.period),
  );
}
