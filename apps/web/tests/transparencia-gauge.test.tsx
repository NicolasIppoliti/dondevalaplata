import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TransparenciaGauge } from "@/components/TransparenciaGauge";
import { computeGaugeGeometry } from "@/lib/gauge";

/**
 * Extracted from the /transparencia score ring markup (fidelity slice F2)
 * so the home dashboard preview can reuse the EXACT same ring, instead of
 * re-implementing the SVG geometry inline a second time. Geometry itself
 * stays owned by the already-tested `computeGaugeGeometry` (see
 * tests/gauge.test.ts) -- this component only wires that geometry into
 * markup + `<CountUp>`.
 */
describe("TransparenciaGauge", () => {
  it("shows the exact score as a fraction, immediately (CountUp's first render, no fake '0')", () => {
    const { container } = render(<TransparenciaGauge value={81} max={100} />);
    expect(container.textContent).toContain("81");
    expect(container.textContent).toContain("/ 100");
  });

  it("the ring SVG is purely decorative (aria-hidden) -- the fraction text is the one accessible source of truth", () => {
    const { container } = render(<TransparenciaGauge value={81} max={100} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("sizes the ring geometry from the shared computeGaugeGeometry helper, at the default 176px size", () => {
    const { container } = render(<TransparenciaGauge value={81} max={100} />);
    const geometry = computeGaugeGeometry(81, 100);
    const arc = container.querySelector("circle:last-of-type");
    expect(arc?.getAttribute("stroke-dasharray")).toBe(
      String(geometry.circumference),
    );
    expect(arc?.getAttribute("stroke-dashoffset")).toBe(
      String(geometry.offset),
    );
  });

  it("accepts a smaller custom size for compact previews (e.g. the home dashboard card)", () => {
    const { container } = render(
      <TransparenciaGauge value={81} max={100} size={128} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("128");
    expect(svg?.getAttribute("height")).toBe("128");
  });
});
