import { describe, expect, it } from "vitest";
import { computeGaugeGeometry } from "@/lib/gauge";

/**
 * Pure geometry for the /transparencia score ring (SVG `stroke-dasharray` +
 * `stroke-dashoffset`). Kept as a tested pure function, same convention as
 * `lib/chartGeometry.ts` and `lib/insight.ts`, instead of inlining the
 * circumference/offset math directly in the page component.
 */
describe("computeGaugeGeometry", () => {
  it("computes the full circumference for the default radius (52)", () => {
    const { circumference } = computeGaugeGeometry(81, 100);
    expect(circumference).toBeCloseTo(2 * Math.PI * 52, 5);
  });

  it("leaves the ring fully empty (offset == circumference) at value 0", () => {
    const { circumference, offset } = computeGaugeGeometry(0, 100);
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("fills the ring completely (offset == 0) when value == max", () => {
    const { offset } = computeGaugeGeometry(100, 100);
    expect(offset).toBeCloseTo(0, 5);
  });

  it("fills the ring proportionally for the real 81/100 transparencia score", () => {
    const { circumference, offset } = computeGaugeGeometry(81, 100);
    expect(offset).toBeCloseTo(circumference * 0.19, 5);
  });

  it("clamps a value above max to a fully filled ring, never overflowing", () => {
    const { offset } = computeGaugeGeometry(120, 100);
    expect(offset).toBeCloseTo(0, 5);
  });

  it("clamps a negative value to an empty ring, never a negative offset", () => {
    const { circumference, offset } = computeGaugeGeometry(-10, 100);
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("treats a zero/invalid max as an empty ring instead of dividing by zero", () => {
    const { circumference, offset } = computeGaugeGeometry(10, 0);
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("accepts a custom radius", () => {
    const { circumference } = computeGaugeGeometry(50, 100, 40);
    expect(circumference).toBeCloseTo(2 * Math.PI * 40, 5);
  });
});
