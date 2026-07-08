import { describe, expect, it } from "vitest";
import { listMissingQuarterLabels } from "@/lib/deudaHistorica";

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
