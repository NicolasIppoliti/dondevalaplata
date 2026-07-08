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
});
