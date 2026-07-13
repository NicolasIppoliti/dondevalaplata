import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import cadenciaNoGap from "./fixtures/cadencia.no-gap.json";
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
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toMatch(/\?/);
  });

  it("lists all 6 ASAP dimensions with got/max shown", () => {
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    for (const dimension of cadencia.dimensions) {
      expect(screen.getAllByText(dimension.name).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getAllByText(/5\s*\/\s*5|30\s*\/\s*30|35\s*\/\s*35|5\s*\/\s*10|3\s*\/\s*10/).length).toBeGreaterThanOrEqual(6);
  });

  it("shows the last period published and lag for a live-tracked dimension", () => {
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    expect(
      screen.getByText(/Estado de Ejecución Presupuestaria de Gastos por finalidad y función 4to Trimestre/),
    ).toBeTruthy();
  });

  it("shows the factual reason and toReach10 text for gap dimensions", () => {
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const gap = cadencia.dimensions.find((d) => d.got < d.max)!;
    expect(screen.getByText(gap.reason)).toBeTruthy();
    expect(screen.getByText(gap.toReach10)).toBeTruthy();
  });

  it("states the 81 -> 100 path with +5/+7/+7", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/\+5/);
    expect(text).toMatch(/\+7/);
    expect(text).toMatch(/81/);
    expect(text).toMatch(/100/);
  });

  it("shows the killer fact as a sourced note", () => {
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    expect(screen.getByText(cadencia.killerFact)).toBeTruthy();
  });

  it("discloses that cadence data is recomputed live on each build", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/se (recalcula|actualiza)/);
    expect(text).toMatch(/build|despliegue/);
  });

  it("never blames a person, party or gestión (neutrality invariant)", () => {
    const { container } = render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/i);
  });

  it("frames the pending dimension with the documentary ocre marker, not an alarm marker", () => {
    render(<CadenceDashboard cadencia={cadencia} transparenciaTotal={81} />);
    const rows = screen.getAllByText("Stock de deuda y perfil de vencimientos");
    const gapRow = rows
      .map((el) => el.closest("li"))
      .find((li) => li?.className.includes("border-l-[5px]"));
    expect(gapRow).toBeTruthy();
    expect(gapRow?.className).toContain("ocre");
    expect(gapRow?.className).not.toContain("stamp");
  });

  it("derives the 'camino de X a 100' path from the transparenciaTotal prop, never a hardcoded 81", () => {
    const { container } = render(
      <CadenceDashboard cadencia={cadencia} transparenciaTotal={85} />,
    );
    const text = container.textContent ?? "";
    expect(text).toMatch(/Camino de 85 a 100/);
    expect(text).toMatch(/85 \+ \d+ = 100/);
  });
});

/**
 * CadenceDashboard with `caughtUp` dimensions (a gap dimension whose
 * document series is now live-current, but the frozen ASAP `got` has not
 * been re-scored yet -- PART 2/3, portal-backfill-fix). The panel must
 * neither fabricate a higher score nor silently keep implying the
 * municipality is still failing to publish.
 */
describe("CadenceDashboard (caughtUp dimensions)", () => {
  const cadenciaUpToDate = loadCadencia(cadenciaNoGap);

  it("still shows the gap panel using the frozen ASAP score (honest -- ASAP has not re-scored)", () => {
    const { container } = render(
      <CadenceDashboard cadencia={cadenciaUpToDate} transparenciaTotal={81} />,
    );
    const text = container.textContent ?? "";
    expect(text).toMatch(/Camino de 81 a 100/);
  });

  it("clarifies a caught-up dimension has already been published, pending the next ASAP report", () => {
    render(<CadenceDashboard cadencia={cadenciaUpToDate} transparenciaTotal={81} />);
    expect(screen.getAllByText(/ya publicado/i).length).toBeGreaterThan(0);
  });

  it("never blames a person, party or gestión even when noting a caught-up dimension", () => {
    const { container } = render(
      <CadenceDashboard cadencia={cadenciaUpToDate} transparenciaTotal={81} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/i);
  });
});
