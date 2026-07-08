import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InteractiveCoparticipacionChart } from "@/components/chart/InteractiveCoparticipacionChart";
import {
  formatArsHuman,
  formatPeriodEsAr,
  formatVariationEsAr,
} from "@/lib/format";

/**
 * Hand-rolled inline-SVG interactive chart (client island) for the
 * /coparticipacion hero: hover/touch tooltip with arithmetic MoM delta,
 * crosshair + active dot, keyboard nav (←/→/Home/End) with an aria-live
 * readout, a labelled end point, a dashed reference line, and a
 * Real/Nominal segmented control that re-renders the headline + unit note.
 * Default view: ONLY the real (inflation-adjusted) series.
 *
 * Formatters (period/value/variation) are NOT props here -- this is a
 * Client Component, and a Server Component page passing functions as
 * props across that boundary fails at build time (React Server
 * Components only serialize plain data, never functions). The component
 * imports `lib/format.ts`'s pure functions directly instead, so these
 * tests exercise the REAL es-AR formatting end-to-end.
 */

// Scrambled input order (not chronological) on purpose -- exercises the
// period-keyed indexing invariant (never trust raw array position).
const POINTS = [
  { period: "2026-03", real: 900, nominal: 1000 },
  { period: "2026-01", real: 1000, nominal: 900 },
  { period: "2026-04", real: 1250, nominal: 1100 },
  { period: "2026-02", real: 1100, nominal: 950 },
];

function renderChart() {
  return render(
    <InteractiveCoparticipacionChart points={POINTS} baseMonthLabel="mayo de 2026" />,
  );
}

function stubRect(el: Element, rect: { width: number; height: number }) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: rect.width,
    bottom: rect.height,
    width: rect.width,
    height: rect.height,
    toJSON() {
      return {};
    },
  } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InteractiveCoparticipacionChart — default view", () => {
  it("shows only the real series headline value (latest period, sorted by period not array order)", () => {
    renderChart();
    // Latest period by SORTED order is 2026-04 (real 1250), even though it
    // sits third in the scrambled input array.
    const headline = document.querySelector("[data-chart-headline-value]");
    expect(headline?.textContent).toBe(formatArsHuman(1250));
  });

  it("orders the traced polyline by period, not input array order (period-keyed invariant)", () => {
    const { container } = renderChart();
    const polylines = container.querySelectorAll("polyline");
    expect(polylines.length).toBeGreaterThan(0);
    const coords = (polylines[0].getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number));
    // 4 sorted periods -> 4 coords, strictly increasing x.
    expect(coords).toHaveLength(4);
    expect(coords[0][0]).toBeLessThan(coords[1][0]);
    expect(coords[1][0]).toBeLessThan(coords[2][0]);
    expect(coords[2][0]).toBeLessThan(coords[3][0]);
  });

  it("labels the end point with the formatted last value", () => {
    renderChart();
    const endLabels = document.querySelectorAll("[data-chart-end-label]");
    expect(endLabels.length).toBeGreaterThan(0);
    expect(endLabels[0].textContent).toBe(formatArsHuman(1250));
  });

  it("renders a dashed reference line labelled with the earliest full/available year", () => {
    renderChart();
    const refLabels = document.querySelectorAll("[data-chart-reference-label]");
    expect(refLabels.length).toBeGreaterThan(0);
    expect(refLabels[0].textContent).toMatch(/Promedio 2026/);
  });

  it("never overlaps the reference-line label with the end-of-line value label (regression: both used to anchor at the same x)", () => {
    // Real production data hit this: the 2024 yearly average and the
    // April 2026 value land at nearly the same chart height, and both
    // labels were right-anchored at the same x -- rendering on top of
    // each other. The reference label must anchor on the OPPOSITE side
    // (left) from the end label (right), regardless of their y proximity.
    const { container } = renderChart();
    const refLabel = container.querySelector("[data-chart-reference-label]");
    const endLabel = container.querySelector("[data-chart-end-label]");
    expect(refLabel).not.toBeNull();
    expect(endLabel).not.toBeNull();
    const refX = Number(refLabel?.getAttribute("x"));
    const endX = Number(endLabel?.getAttribute("x"));
    expect(refLabel?.getAttribute("text-anchor")).toBe("start");
    expect(endLabel?.getAttribute("text-anchor")).toBe("end");
    expect(refX).toBeLessThan(endX);
  });
});

describe("InteractiveCoparticipacionChart — Real/Nominal segmented control", () => {
  it("switches the headline value + unit note to the nominal series on click", () => {
    renderChart();
    const nominalButton = screen.getAllByRole("button", { name: "Nominal" })[0];
    fireEvent.click(nominalButton);
    const headlines = document.querySelectorAll("[data-chart-headline-value]");
    // Latest nominal value (2026-04) is 1100, not the real 1250.
    expect(headlines[0].textContent).toBe(formatArsHuman(1100));
    expect(nominalButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks Real as pressed by default", () => {
    renderChart();
    const realButton = screen.getAllByRole("button", { name: "Real" })[0];
    expect(realButton.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("InteractiveCoparticipacionChart — keyboard navigation + aria-live readout", () => {
  it("activates the last point on focus", () => {
    renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    fireEvent.focus(wraps[0]);
    const readout = document.querySelectorAll("[data-chart-readout]")[0];
    expect(readout.textContent).toContain(formatPeriodEsAr("2026-04"));
    expect(readout.textContent).toContain(formatArsHuman(1250));
  });

  it("Home jumps to the first point and reports it as the series base (no prior month)", () => {
    renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    fireEvent.focus(wraps[0]);
    fireEvent.keyDown(wraps[0], { key: "Home" });
    const readout = document.querySelectorAll("[data-chart-readout]")[0];
    expect(readout.textContent).toContain(formatPeriodEsAr("2026-01"));
    expect(readout.textContent).toMatch(/mes base/);
  });

  it("ArrowRight moves forward one point and reports a real arithmetic delta", () => {
    renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    fireEvent.focus(wraps[0]);
    fireEvent.keyDown(wraps[0], { key: "Home" });
    fireEvent.keyDown(wraps[0], { key: "ArrowRight" });
    const readout = document.querySelectorAll("[data-chart-readout]")[0];
    // 2026-02 real (1100) vs 2026-01 real (1000) = +10%
    expect(readout.textContent).toContain(formatPeriodEsAr("2026-02"));
    expect(readout.textContent).toContain("▲");
    expect(readout.textContent).toContain(formatVariationEsAr(0.1));
  });

  it("ArrowLeft/End also move the active point (full arrow-key coverage)", () => {
    renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    fireEvent.focus(wraps[0]);
    fireEvent.keyDown(wraps[0], { key: "End" });
    let readout = document.querySelectorAll("[data-chart-readout]")[0];
    expect(readout.textContent).toContain(formatPeriodEsAr("2026-04"));
    fireEvent.keyDown(wraps[0], { key: "ArrowLeft" });
    readout = document.querySelectorAll("[data-chart-readout]")[0];
    // 2026-03 real (900) vs 2026-02 real (1100) -> a real drop
    expect(readout.textContent).toContain(formatPeriodEsAr("2026-03"));
    expect(readout.textContent).toContain("▼");
  });
});

describe("InteractiveCoparticipacionChart — pointer/touch tooltip", () => {
  it("shows no tooltip before any interaction", () => {
    renderChart();
    expect(document.querySelector("[data-chart-tooltip]")).toBeNull();
  });

  it("shows a tooltip with month + value + delta on pointer move, hit-testing by nearest period", () => {
    const { container } = renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    const wrap = wraps[0];
    // Mobile variant viewBox is 380 wide; stub a 1:1 pixel-to-viewbox rect
    // so clientX lands exactly on a known coordinate.
    stubRect(wrap, { width: 380, height: 460 });
    // Read the ACTUAL plotted x for index 2 (2026-03) from the rendered
    // polyline instead of hand-computing the padding/gutter math here.
    const polyline = container.querySelectorAll("polyline")[0];
    const coords = (polyline.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number));
    const targetX = coords[2][0];
    fireEvent.pointerMove(wrap, { clientX: targetX, clientY: 100 });
    const tooltip = document.querySelector("[data-chart-tooltip]");
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain(formatPeriodEsAr("2026-03"));
    expect(tooltip?.textContent).toContain(formatArsHuman(900));
    expect(tooltip?.textContent).toContain("▼");
  });

  it("clears the tooltip on pointer leave", () => {
    const { container } = renderChart();
    const wraps = screen.getAllByRole("img", {
      name: /Coparticipación mensual/i,
    });
    const wrap = wraps[0];
    stubRect(wrap, { width: 380, height: 460 });
    const polyline = container.querySelectorAll("polyline")[0];
    const coords = (polyline.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number));
    fireEvent.pointerMove(wrap, { clientX: coords[2][0], clientY: 100 });
    expect(document.querySelector("[data-chart-tooltip]")).not.toBeNull();
    fireEvent.pointerLeave(wrap);
    expect(document.querySelector("[data-chart-tooltip]")).toBeNull();
  });
});
