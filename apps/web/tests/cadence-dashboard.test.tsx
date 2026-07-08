import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import { CadenceDashboard } from "@/components/CadenceDashboard";
import { loadCadencia } from "@/lib/data";

/**
 * CadenceDashboard (feature G1): a status dashboard of the 6 ASAP
 * dimensions -- last period published, lag, points got/max, and (for the
 * weak ones) the factual reason + what reaching 10 requires. Covers: the
 * 81->100 path (+5/+7/+7), the "Nov-2025 estas tres estaban en 10/10/10"
 * sourced note, factual/neutral tone (never blaming a person or gestión),
 * and the "se recalcula en cada build" live-data disclosure.
 */
describe("CadenceDashboard", () => {
  const cadencia = loadCadencia(cadenciaValid);

  it("titles the section as a question, per DESIGN.md convention", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toMatch(/\?/);
  });

  it("lists all 6 ASAP dimensions with got/max shown", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    for (const dimension of cadencia.dimensions) {
      expect(screen.getAllByText(dimension.name).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getAllByText(/5\s*\/\s*5|30\s*\/\s*30|35\s*\/\s*35|5\s*\/\s*10|3\s*\/\s*10/).length).toBeGreaterThanOrEqual(6);
  });

  it("shows the last period published and lag for a live-tracked dimension", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    expect(
      screen.getByText(/Estado de Ejecución Presupuestaria de Gastos por finalidad y función 4to Trimestre/),
    ).toBeTruthy();
  });

  it("shows the factual reason and toReach10 text for gap dimensions", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    const gap = cadencia.dimensions.find((d) => d.got < d.max)!;
    expect(screen.getByText(gap.reason)).toBeTruthy();
    expect(screen.getByText(gap.toReach10)).toBeTruthy();
  });

  it("states the 81 -> 100 path with +5/+7/+7", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/\+5/);
    expect(text).toMatch(/\+7/);
    expect(text).toMatch(/81/);
    expect(text).toMatch(/100/);
  });

  it("shows the killer fact as a sourced note", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    expect(screen.getByText(cadencia.killerFact)).toBeTruthy();
  });

  it("discloses that cadence data is recomputed live on each build", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/se (recalcula|actualiza)/);
    expect(text).toMatch(/build|despliegue/);
  });

  it("never blames a person, party or gestión (neutrality invariant)", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/i);
  });

  it("frames the pending dimension with the documentary ocre marker, not an alarm marker", () => {
    render(<CadenceDashboard cadencia={cadencia} />);
    const rows = screen.getAllByText("Stock de deuda y perfil de vencimientos");
    const gapRow = rows
      .map((el) => el.closest("li"))
      .find((li) => li?.className.includes("border-l-[5px]"));
    expect(gapRow).toBeTruthy();
    expect(gapRow?.className).toContain("ocre");
    expect(gapRow?.className).not.toContain("stamp");
  });
});
