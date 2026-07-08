import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import cadenciaValid from "./fixtures/cadencia.valid.json";
import manifestValid from "./fixtures/manifest.valid.json";
import { DeudaCounter } from "@/components/DeudaCounter";
import { loadCadencia, loadManifest } from "@/lib/data";
import { resolveSourceRefs } from "@/lib/sources";

/**
 * DeudaCounter (feature G1): a prominent, factual widget stating the
 * municipality has not updated its published stock-de-deuda since a given
 * (build-time-computed) date, with days/quarters elapsed, the last figure,
 * the legal hook (Ordenanza 3638 Art. 11), and dual-link provenance +
 * sha256. Never Date.now() at render -- every elapsed figure comes from
 * the build-time `data/cadencia.json` payload.
 */
describe("DeudaCounter", () => {
  const cadencia = loadCadencia(cadenciaValid);
  const manifestFixture = [
    ...manifestValid,
    {
      id: "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre",
      capability: "mcr-docs",
      source: "mcr.gob.ar",
      source_url:
        "https://mcr.gob.ar/wp-content/uploads/2025/11/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-3o-TRIMESTRE.pdf",
      archived_url: "https://pub-example.r2.dev/mcr-docs/stock-de-deuda-3o-trimestre.pdf",
      archived_path: "archive/mcr-docs/stock-de-deuda-3o-trimestre.pdf",
      sha256: "99b3331defce8b2caaf295613bc96ecb4403bc452aec3f2c372ac8385a187aa",
      mime: "application/pdf",
      bytes: 8126,
      fetched_at: "2026-07-08T15:46:09Z",
      status: "ok",
      notes: "Fixture record for tests.",
    },
  ];
  const manifest = loadManifest(manifestFixture);
  const sourceLinks = resolveSourceRefs(cadencia.deuda.sourceRefs, manifest);

  it("states the municipality has not updated the debt figure since the last period end", () => {
    const { container } = render(
      <DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />,
    );
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).toMatch(/no actualiza/);
    expect(text).toMatch(/30 de septiembre de 2025/);
  });

  it("shows the days elapsed and the missing quarters count", () => {
    render(<DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />);
    expect(screen.getByText(String(cadencia.deuda.elapsedDays))).toBeTruthy();
    expect(screen.getByText(/trimestres sin publicar/i)).toBeTruthy();
  });

  it("shows the last published figure", () => {
    render(<DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />);
    expect(screen.getByText(/46\.876\.896/)).toBeTruthy();
  });

  it("cites Ordenanza 3638, Art. 11 as the legal hook", () => {
    const { container } = render(
      <DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />,
    );
    const text = container.textContent ?? "";
    expect(text).toMatch(/Ordenanza 3638/);
    expect(text).toMatch(/Art\.?\s*11/);
  });

  it("renders dual-link provenance (original + archived) and a short sha256", () => {
    render(<DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />);
    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /copia archivada/i })).toBeTruthy();
    expect(screen.getByText(/sha256\s+99b3331defc/)).toBeTruthy();
  });

  it("is framed factually, never a judgment of a person or gestión", () => {
    const { container } = render(
      <DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de|corrupci[oó]n/i);
  });

  it("renders a compact variant without the ordenanza prose, for the home preview", () => {
    render(
      <DeudaCounter deuda={cadencia.deuda} sourceLinks={sourceLinks} compact />,
    );
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/46\.876\.896/);
    expect(text).not.toMatch(/Ordenanza 3638/);
  });
});
