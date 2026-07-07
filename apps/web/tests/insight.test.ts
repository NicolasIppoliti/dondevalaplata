import { describe, expect, it } from "vitest";
import { computeCoparticipacionTrend } from "@/lib/insight";
import { getPortalData } from "@/lib/sources";
import type { CoparticipacionPoint } from "@/lib/schemas";

/**
 * The coparticipación page leads with a plain-language conclusion sentence.
 * It MUST be derived from the real data, never a hardcoded claim -- these
 * tests pin the classification logic (up/flat/down) against synthetic
 * fixtures AND against the real repo data, so an honest "flat" verdict can
 * never silently drift into an unsupported "up"/"down" claim without a
 * test failing first.
 */

function point(period: string, realArs: number): CoparticipacionPoint {
  return { period, nominalArs: realArs, realArs };
}

describe("computeCoparticipacionTrend", () => {
  it("classifies as 'up' when the latest real value is clearly above the same month a year earlier", () => {
    const points = [point("2025-04", 1_000_000), point("2026-04", 1_300_000)];
    const trend = computeCoparticipacionTrend(points);
    expect(trend.direction).toBe("up");
    expect(trend.yoyFraction).toBeCloseTo(0.3, 5);
    expect(trend.message.toLowerCase()).toContain("sub");
  });

  it("classifies as 'down' when the latest real value is clearly below the same month a year earlier", () => {
    const points = [point("2025-04", 1_300_000), point("2026-04", 1_000_000)];
    const trend = computeCoparticipacionTrend(points);
    expect(trend.direction).toBe("down");
    expect(trend.yoyFraction).toBeCloseTo(-0.2307692, 5);
    expect(trend.message.toLowerCase()).toContain("cay");
  });

  it("classifies as 'flat' when the latest real value is within the neutral band of the same month a year earlier", () => {
    const points = [point("2025-04", 1_000_000), point("2026-04", 1_020_000)];
    const trend = computeCoparticipacionTrend(points);
    expect(trend.direction).toBe("flat");
    expect(trend.message.toLowerCase()).toContain("estanc");
  });

  it("never claims a direction the data doesn't support: exact zero change is 'flat', not 'up' or 'down'", () => {
    const points = [point("2025-04", 1_000_000), point("2026-04", 1_000_000)];
    const trend = computeCoparticipacionTrend(points);
    expect(trend.direction).toBe("flat");
    expect(trend.yoyFraction).toBe(0);
  });

  it("falls back to comparing against the earliest year's average when there is no same-month prior-year point", () => {
    const points = [
      point("2026-01", 1_000_000),
      point("2026-02", 1_000_000),
      point("2026-03", 1_500_000),
    ];
    const trend = computeCoparticipacionTrend(points);
    expect(trend.yoyFraction).toBeNull();
    expect(trend.earliestYearAverageFraction).not.toBeNull();
    expect(trend.direction).toBe("up");
  });

  it("does not crash on an empty series and returns a safe, non-committal verdict", () => {
    const trend = computeCoparticipacionTrend([]);
    expect(trend.direction).toBe("flat");
    expect(trend.yoyFraction).toBeNull();
    expect(trend.earliestYearAverageFraction).toBeNull();
    expect(trend.message.length).toBeGreaterThan(0);
  });

  it("is insensitive to input order (sorts by period internally)", () => {
    const forward = computeCoparticipacionTrend([
      point("2025-04", 1_000_000),
      point("2026-04", 1_300_000),
    ]);
    const reversed = computeCoparticipacionTrend([
      point("2026-04", 1_300_000),
      point("2025-04", 1_000_000),
    ]);
    expect(reversed).toEqual(forward);
  });

  it("real repo data (Coronel Rosales): the honest verdict is 'flat', not a fabricated 'up' or 'down'", () => {
    // Locks in today's real classification (YoY Apr2026 vs Apr2025 real ≈
    // +2.1%; earliest-year(2024) average vs latest real ≈ -2.4% -- both
    // inside the neutral band) so a future data refresh that actually
    // moves the needle forces this test to be revisited deliberately,
    // instead of the UI silently keeping a stale claim.
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (series) => series.municipioId === "06182",
    );
    const trend = computeCoparticipacionTrend(coronelRosales?.points ?? []);
    expect(trend.direction).toBe("flat");
  });
});
