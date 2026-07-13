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
});
