import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorLegend } from "@/components/ColorLegend";

/**
 * "Cómo leer los colores" explainer (Direction C graft). Reusable
 * component stating the neutrality invariant: green/red are arithmetic
 * only, never a judgment on a gestión/party. INVIOLABLE per DESIGN.md.
 */
describe("ColorLegend", () => {
  it("labels itself as the color-reading explainer region", () => {
    render(<ColorLegend />);
    expect(
      screen.getByRole("region", { name: /c[oó]mo leer los colores/i }),
    ).toBeTruthy();
  });

  it("states the neutrality invariant: arithmetic only, never a judgment on a gestión/partido", () => {
    render(<ColorLegend />);
    const text = screen.getByRole("region").textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/sub(e|i[oó])/);
    expect(text).toMatch(/cae|baj/);
    expect(text).toMatch(/nunca opinan|nunca juzga/);
    expect(text).toMatch(/gesti[oó]n|partido/);
  });

  it("pairs the up/down legend entries with a ▲/▼ marker, never color alone (WCAG 1.4.1)", () => {
    render(<ColorLegend />);
    expect(screen.getAllByText(/▲/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/▼/).length).toBeGreaterThan(0);
  });

  it("defaults its own title to an <h3> (fits after a page's existing h1 -> h2 chain, e.g. /coparticipacion)", () => {
    render(<ColorLegend />);
    const heading = screen.getByRole("heading", {
      name: /c[oó]mo leer los colores/i,
    });
    expect(heading.tagName).toBe("H3");
  });

  it('accepts headingLevel="h2" for pages where it is the first content heading after the (sr-only) h1 -- e.g. the home hero, which has no h2 above it (Lighthouse "heading-order" would otherwise fail)', () => {
    render(<ColorLegend headingLevel="h2" />);
    const heading = screen.getByRole("heading", {
      name: /c[oó]mo leer los colores/i,
    });
    expect(heading.tagName).toBe("H2");
  });
});
