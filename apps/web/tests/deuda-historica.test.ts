import { describe, expect, it } from "vitest";
import { getAnomalousPeriods, listMissingQuarterLabels } from "@/lib/deudaHistorica";

/**
 * `listMissingQuarterLabels` (feature H2a): enumerates the N quarter
 * labels immediately AFTER a given quarter-end date -- e.g. the "acá
 * dejaron de publicar" marker on the deuda histórica chart, which names
 * the specific missing quarters (4to trimestre 2025, 1er trimestre 2026,
 * ...) rather than just a bare count. Pure/build-time: `quartersMissing`
 * always comes from the already-computed `data/cadencia.json`, never
 * `Date.now()` here.
 */
describe("listMissingQuarterLabels", () => {
  it("lists the next N quarters after a 3er trimestre (30/09) close", () => {
    expect(listMissingQuarterLabels("2025-09-30", 3)).toEqual([
      "4to trimestre 2025",
      "1er trimestre 2026",
      "2do trimestre 2026",
    ]);
  });

  it("wraps the year forward when the missing run crosses a year-end", () => {
    expect(listMissingQuarterLabels("2025-12-31", 2)).toEqual([
      "1er trimestre 2026",
      "2do trimestre 2026",
    ]);
  });

  it("returns an empty list when nothing is missing", () => {
    expect(listMissingQuarterLabels("2025-09-30", 0)).toEqual([]);
  });

  it("handles a 1er trimestre (31/03) close", () => {
    expect(listMissingQuarterLabels("2026-03-31", 1)).toEqual([
      "2do trimestre 2026",
    ]);
  });
});

/**
 * `getAnomalousPeriods` (Q4-2025 debt-figure anomaly disclosure): picks out
 * the `period` keys flagged `anomaly.flagged === true`, so `SvgChart` can
 * exclude them from its y-axis domain and render them clamped with an
 * off-scale marker instead of stretching every other point flat.
 */
describe("getAnomalousPeriods", () => {
  it("returns an empty set when no point is flagged", () => {
    expect(
      getAnomalousPeriods([
        { period: "2025-Q1" },
        { period: "2025-Q2" },
      ]),
    ).toEqual(new Set());
  });

  it("picks out only the flagged period(s)", () => {
    expect(
      getAnomalousPeriods([
        { period: "2025-Q3" },
        { period: "2025-Q4", anomaly: { flagged: true, note: "39x" } },
        { period: "2026-Q1" },
      ]),
    ).toEqual(new Set(["2025-Q4"]));
  });
});
