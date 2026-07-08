import { describe, expect, it } from "vitest";
import {
  computeChartLayout,
  computeMomDelta,
  computeReferenceYearAverage,
  nearestPeriodIndex,
} from "@/lib/chartGeometry";

/**
 * Pure geometry/interaction helpers for the interactive coparticipación
 * chart (client island, /coparticipacion). Kept as pure functions so the
 * period-keyed indexing invariant, MoM delta arithmetic and reference-year
 * average can be tested without touching the DOM or simulating pointer
 * events (Extract-Before-Mock rule).
 */

describe("computeChartLayout — period-keyed indexing (never positional)", () => {
  it("orders coords by SORTED period, not by input array order", () => {
    const layout = computeChartLayout({
      points: [
        { period: "2026-03", value: 30 },
        { period: "2026-01", value: 10 },
        { period: "2026-02", value: 20 },
      ],
      viewBoxWidth: 300,
      viewBoxHeight: 100,
    });
    expect(layout.periods).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(layout.coords.map((c) => c.period)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    // x must increase strictly with sorted period order, regardless of the
    // scrambled input order above.
    expect(layout.coords[0].x).toBeLessThan(layout.coords[1].x);
    expect(layout.coords[1].x).toBeLessThan(layout.coords[2].x);
  });

  it("places the first and last coords at the padded viewBox edges", () => {
    const layout = computeChartLayout({
      points: [
        { period: "2026-01", value: 10 },
        { period: "2026-02", value: 20 },
      ],
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      padding: { top: 10, right: 10, bottom: 10, left: 20 },
    });
    expect(layout.coords[0].x).toBeCloseTo(20, 5);
    expect(layout.coords[1].x).toBeCloseTo(200 - 10, 5);
  });

  it("maps a higher value to a smaller y (SVG y grows downward)", () => {
    const layout = computeChartLayout({
      points: [
        { period: "2026-01", value: 10 },
        { period: "2026-02", value: 90 },
      ],
      viewBoxWidth: 200,
      viewBoxHeight: 100,
    });
    expect(layout.coords[1].y).toBeLessThan(layout.coords[0].y);
  });

  it("produces the requested number of gridlines evenly spaced across the value range", () => {
    const layout = computeChartLayout({
      points: [
        { period: "2026-01", value: 0 },
        { period: "2026-02", value: 100 },
      ],
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      gridLineCount: 5,
    });
    expect(layout.gridLines).toHaveLength(5);
    expect(layout.gridLines[0].value).toBe(0);
    expect(layout.gridLines[4].value).toBe(100);
  });
});

describe("computeChartLayout — scaleValueToY reuse for auxiliary lines (reference line)", () => {
  it("exposes a scaleValueToY helper consistent with the plotted coords", () => {
    const layout = computeChartLayout({
      points: [
        { period: "2026-01", value: 0 },
        { period: "2026-02", value: 100 },
      ],
      viewBoxWidth: 200,
      viewBoxHeight: 100,
    });
    expect(layout.scaleValueToY(0)).toBeCloseTo(layout.coords[0].y, 5);
    expect(layout.scaleValueToY(100)).toBeCloseTo(layout.coords[1].y, 5);
  });
});

describe("computeMomDelta — arithmetic month-over-month variation", () => {
  it("returns null fraction and 'flat' direction for the first (base) point", () => {
    const result = computeMomDelta([1000, 1200], 0);
    expect(result).toEqual({ direction: "flat", fraction: null });
  });

  it("returns 'up' with the real positive fraction when the value rose", () => {
    const result = computeMomDelta([1000, 1134], 1);
    expect(result.direction).toBe("up");
    expect(result.fraction).toBeCloseTo(0.134, 3);
  });

  it("returns 'down' with the real negative fraction when the value fell", () => {
    const result = computeMomDelta([2000, 1000], 1);
    expect(result.direction).toBe("down");
    expect(result.fraction).toBeCloseTo(-0.5, 5);
  });

  it("returns 'flat' for a near-zero (sub-epsilon) change, never a fabricated tiny arrow", () => {
    const result = computeMomDelta([1000, 1000.2], 1);
    expect(result.direction).toBe("flat");
  });
});

describe("computeReferenceYearAverage — earliest full calendar year, falling back to earliest available", () => {
  it("averages the earliest FULL (12-point) calendar year present", () => {
    const points = [
      { period: "2023-12", value: 100 },
      ...Array.from({ length: 12 }, (_, i) => ({
        period: `2024-${String(i + 1).padStart(2, "0")}`,
        value: 200,
      })),
      { period: "2025-01", value: 400 },
    ];
    const result = computeReferenceYearAverage(points);
    expect(result).not.toBeNull();
    expect(result?.year).toBe("2024");
    expect(result?.average).toBeCloseTo(200, 5);
  });

  it("falls back to the earliest available (partial) year when no year has all 12 points", () => {
    const points = [
      { period: "2025-01", value: 100 },
      { period: "2025-02", value: 300 },
    ];
    const result = computeReferenceYearAverage(points);
    expect(result).toEqual({ year: "2025", average: 200 });
  });

  it("returns null for an empty series", () => {
    expect(computeReferenceYearAverage([])).toBeNull();
  });
});

describe("nearestPeriodIndex — pointer hit-testing clamps to the series range", () => {
  const coords = [{ x: 0 }, { x: 10 }, { x: 20 }, { x: 30 }];

  it("finds the closest coord index to a given x", () => {
    expect(nearestPeriodIndex(coords, 22)).toBe(2);
    expect(nearestPeriodIndex(coords, 8)).toBe(1);
  });

  it("clamps to the first index for x below the series range", () => {
    expect(nearestPeriodIndex(coords, -50)).toBe(0);
  });

  it("clamps to the last index for x above the series range", () => {
    expect(nearestPeriodIndex(coords, 999)).toBe(3);
  });
});
