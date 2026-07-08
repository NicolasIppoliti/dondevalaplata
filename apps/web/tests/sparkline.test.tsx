import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "@/components/chart/Sparkline";

/**
 * Zero-JS decorative sparkline for the home hero card (real series only).
 * No interactivity, no tooltip -- just a quiet trend line + a marked last
 * point, server-rendered like every other chart primitive on this site.
 */
describe("Sparkline", () => {
  it("renders a single polyline tracing every point, plus a marked last point", () => {
    const { container } = render(
      <Sparkline
        points={[
          { period: "2026-01", value: 100 },
          { period: "2026-02", value: 150 },
          { period: "2026-03", value: 120 },
        ]}
        ariaHidden
      />,
    );
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const coords = (polyline?.getAttribute("points") ?? "").trim().split(/\s+/);
    expect(coords).toHaveLength(3);
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("is decorative (aria-hidden) by default so it never duplicates the accessible headline figure", () => {
    const { container } = render(
      <Sparkline
        points={[
          { period: "2026-01", value: 100 },
          { period: "2026-02", value: 150 },
        ]}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders nothing (no polyline) for fewer than 2 points instead of a degenerate flat line", () => {
    const { container } = render(<Sparkline points={[{ period: "2026-01", value: 100 }]} />);
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("orders the traced line by period, not input array order (period-keyed, not positional)", () => {
    const { container } = render(
      <Sparkline
        points={[
          { period: "2026-03", value: 300 },
          { period: "2026-01", value: 100 },
          { period: "2026-02", value: 200 },
        ]}
      />,
    );
    const polyline = container.querySelector("polyline");
    const coords = (polyline?.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number));
    expect(coords[0][0]).toBeLessThan(coords[1][0]);
    expect(coords[1][0]).toBeLessThan(coords[2][0]);
  });
});
