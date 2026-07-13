import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import deudaHistoricaValid from "./fixtures/deuda-historica.valid.json";
import deudaHistoricaNoGap from "./fixtures/deuda-historica.no-gap.json";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import cadenciaNoGap from "./fixtures/cadencia.no-gap.json";
import manifestValid from "./fixtures/manifest.valid.json";
import { DeudaHistoricaChart } from "@/components/deuda-historica/DeudaHistoricaChart";
import { loadCadencia, loadDeudaHistorica, loadManifest } from "@/lib/data";
import { resolveSourceRefs } from "@/lib/sources";

/**
 * DeudaHistoricaChart (feature H2a): server-rendered inline SVG showing the
 * 3 published quarters of deuda pública histórica + an explicit "acá
 * dejaron de publicar" marker for the quarters missing since. Always
 * accompanied by an accessible data table + dual-link/sha256 provenance
 * per quarter.
 */
describe("DeudaHistoricaChart", () => {
  const deudaHistorica = loadDeudaHistorica(deudaHistoricaValid);
  const cadencia = loadCadencia(cadenciaValid);
  const manifestFixture = [
    ...manifestValid,
    ...deudaHistorica.series.map((point) => ({
      id: point.sourceRef,
      capability: "mcr-docs",
      source: "mcr.gob.ar",
      source_url: `https://mcr.gob.ar/${point.sourceRef}.pdf`,
      archived_url: `https://pub-example.r2.dev/${point.sourceRef}.pdf`,
      archived_path: `archive/${point.sourceRef}.pdf`,
      sha256: "689df97fe6f383a136d6a74c88cecce910b8e3f72e1385aa4e8253338aa723a6",
      mime: "application/pdf",
      bytes: 8000,
      fetched_at: "2026-07-08T20:09:21Z",
      status: "ok",
      notes: "Fixture record for tests.",
    })),
  ];
  const manifest = loadManifest(manifestFixture);
  const sourceLinks = resolveSourceRefs(
    deudaHistorica.series.map((p) => p.sourceRef),
    manifest,
  );

  it("renders an SVG chart with one point per published quarter", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    const polyline = container.querySelector("polyline");
    const points = (polyline?.getAttribute("points") ?? "").trim().split(/\s+/);
    expect(points).toHaveLength(3);
  });

  it("renders an accessible data table with the 3 quarters and their totals", () => {
    render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const table = screen.getByRole("table");
    const bodyRows = table.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(3);
    expect(within(table).getByText(/1er trimestre 2025/)).toBeTruthy();
    expect(within(table).getByText(/3er trimestre 2025/)).toBeTruthy();
  });

  it('shows a visually explicit "acá dejaron de publicar" marker naming the missing quarters', () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).toMatch(/dejaron de publicar/);
    expect(text).toMatch(/4to trimestre 2025/);
    expect(text).toMatch(/1er trimestre 2026/);
    expect(text).toMatch(/2do trimestre 2026/);
    expect(text).toMatch(String(cadencia.deuda.elapsedDays));
  });

  it('marks the gap with the neutral "aviso documental" token, never the alarm/stamp color', () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const marker = container.querySelector(".border-ocre");
    expect(marker).not.toBeNull();
  });

  it("discloses honestly that no composition breakdown is shown", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).toMatch(/no (se )?(publica|muestra|incluye)/);
  });

  it("renders dual-link provenance + sha256 for every one of the 3 quarters", () => {
    render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    expect(screen.getAllByRole("link", { name: /fuente original/i })).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: /copia archivada/i })).toHaveLength(3);
  });

  it("is framed factually, never a judgment of a person or gestión", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistorica}
        deuda={cadencia.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|corrupci[oó]n/i);
  });
});

/**
 * DeudaHistoricaChart with `quartersMissing === 0` (no gap): asserting
 * "acá dejaron de publicar" or "antes de dejar de actualizar la serie"
 * when the series is current would be factually false (PART 2 honesty
 * fix, portal-backfill-fix).
 */
describe("DeudaHistoricaChart (no gap / série al día)", () => {
  const deudaHistoricaUpToDate = loadDeudaHistorica(deudaHistoricaNoGap);
  const cadenciaUpToDate = loadCadencia(cadenciaNoGap);
  const manifestFixture = [
    ...manifestValid,
    ...deudaHistoricaUpToDate.series.map((point) => ({
      id: point.sourceRef,
      capability: "mcr-docs",
      source: "mcr.gob.ar",
      source_url: `https://mcr.gob.ar/${point.sourceRef}.pdf`,
      archived_url: `https://pub-example.r2.dev/${point.sourceRef}.pdf`,
      archived_path: `archive/${point.sourceRef}.pdf`,
      sha256: "83e3daec0cac376d5469c2a27d7f53569e10dedddfa1fd770a2c04119ad4d493",
      mime: "application/pdf",
      bytes: 8000,
      fetched_at: "2026-07-13T17:38:12Z",
      status: "ok",
      notes: "Fixture record for tests.",
    })),
  ];
  const manifest = loadManifest(manifestFixture);
  const sourceLinks = resolveSourceRefs(
    deudaHistoricaUpToDate.series.map((p) => p.sourceRef),
    manifest,
  );

  it('never shows the "acá dejaron de publicar" marker when there is no gap', () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).not.toMatch(/dejaron de publicar/);
    expect(text.toLowerCase()).not.toMatch(/antes de dejar de actualizar/);
  });

  it('shows a neutral "serie al día" confirmation instead', () => {
    render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    expect(screen.getByText(/serie al d[ií]a/i)).toBeTruthy();
  });

  /**
   * Anomaly disclosure (Q4-2025): the fixture's 4to trimestre 2025 point is
   * flagged `anomaly.flagged: true` -- a VERIFIED-CORRECT figure that is
   * nonetheless ~39x its neighboring quarters. The chart must stay
   * readable for every OTHER quarter (never squash them flat scaling to
   * the outlier) while still disclosing the real value faithfully.
   */
  it("renders an off-scale marker with the real value for the anomalous quarter", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const marker = container.querySelector("[data-chart-outlier-marker]");
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toContain("↑");
    const valueLabel = container.querySelector("[data-chart-outlier-value]");
    expect(valueLabel?.textContent).toBe("$ 1.826.113.416,70");
  });

  it("scales the y-axis to the non-anomalous range, not the Q4-2025 outlier", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const gridlineTexts = Array.from(
      container.querySelectorAll("[data-chart-gridline-value]"),
    ).map((el) => el.textContent ?? "");
    // The top gridline must land near the 2nd-highest point (1er trimestre
    // 2025, $ 194.447.135,09 -> "$ 194 millones"), never near the outlier
    // ("$ 1.830 millones") -- otherwise every non-anomalous quarter would
    // be visually collapsed near the chart's floor.
    expect(gridlineTexts.some((t) => t.includes("194"))).toBe(true);
    expect(gridlineTexts.some((t) => t.includes("1.830"))).toBe(false);
    expect(gridlineTexts.some((t) => t.includes("1.826"))).toBe(false);
  });

  it("shows a neutral note naming the exact figure, the inconsistency, and that it's shown as published", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("$ 1.826.113.416,70");
    expect(text).toMatch(/no cierra/i);
    expect(text.toLowerCase()).toMatch(/tal como fue publicad/);
    expect(text.toLowerCase()).toMatch(/confirme? o corrij/);
  });

  it("links the anomaly note to the pedido generator", () => {
    render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const link = screen.getByRole("link", { name: /generá el pedido acá/i });
    expect(link.getAttribute("href")).toBe("/pedidos");
  });

  it("never uses an accusatory word in the anomaly note", () => {
    const { container } = render(
      <DeudaHistoricaChart
        deudaHistorica={deudaHistoricaUpToDate}
        deuda={cadenciaUpToDate.deuda}
        sourceLinks={sourceLinks}
      />,
    );
    const text = (container.textContent ?? "").toLowerCase();
    for (const word of ["estafa", "corrupci", "escondi", "minti", "delito", "fraude"]) {
      expect(text).not.toContain(word);
    }
  });
});
