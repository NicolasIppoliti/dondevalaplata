import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Page from "@/app/adjudicaciones/page";
import { getPortalData } from "@/lib/sources";

/**
 * /adjudicaciones — SIBOM adjudicaciones monitor + reconstructed proveedores
 * padrón (feature G3). Covers: neutral/factual framing, the honest scope
 * caveat (only formal-procedure spend, no direct purchases/sueldos), the
 * skipped-acts disclosure, dual-link provenance + sha256, and that both the
 * table and the padrón render real data.
 */
describe("/adjudicaciones page", () => {
  it("titles the section as a question, in the display heading level", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent?.length).toBeGreaterThan(0);
  });

  it("frames the page factually: 'publicadas', never an accusation word", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/adjudicaciones publicadas por el municipio/);
    expect(text).not.toMatch(/corrupci[oó]n|sospech|irregular/);
  });

  it("discloses the honest scope caveat (no direct purchases below threshold, no sueldos)", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/licitaci[oó]n, concurso o decreto/);
    expect(text).toMatch(/no incluye compras directas/);
    expect(text).toMatch(/ni los sueldos/);
  });

  it("discloses how many bulletins/decrees were scanned and how many acts were skipped", () => {
    const { adjudicaciones } = getPortalData();
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toContain(String(adjudicaciones.bulletinsScanned));
    expect(text).toContain(String(adjudicaciones.skippedCount));
  });

  it("renders the searchable table with real records from data/adjudicaciones.json", () => {
    const { adjudicaciones } = getPortalData();
    render(<Page />);
    expect(screen.getByRole("searchbox", { name: /buscar/i })).toBeTruthy();
    const first = adjudicaciones.records[0];
    // getAllByText, not getByText: a vendor with several awards renders once
    // per row, and the assertion here is "the first record is rendered", not
    // "this vendor won exactly once".
    expect(screen.getAllByText(first.proveedor).length).toBeGreaterThan(0);
  });

  it("expanding a row reveals dual-link provenance (original + archived) with a sha256", () => {
    const { adjudicaciones } = getPortalData();
    render(<Page />);
    const first = adjudicaciones.records[0];
    const [firstToggle] = screen.getAllByRole("button", {
      name: new RegExp(`ver detalle de ${escapeRegExp(first.proveedor)}`, "i"),
    });
    fireEvent.click(firstToggle);
    expect(screen.getAllByRole("link", { name: /fuente original/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /copia archivada/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sha256/i).length).toBeGreaterThan(0);
  });

  it("renders the padrón de proveedores tab with real aggregated data and cites Ordenanza 3638", () => {
    const { proveedores } = getPortalData();
    render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));
    expect(screen.getByText(/reconstruido a partir del bolet/i)).toBeTruthy();
    expect(screen.getAllByText(/ordenanza 3638/i).length).toBeGreaterThan(0);
    const first = proveedores.proveedores[0];
    expect(screen.getAllByText(first.proveedor).length).toBeGreaterThan(0);
  });

  it("never renders titularidad registral markup, its toggle button, or any socio name -- TITULARIDAD_ENABLED is false (feature parked 2026-07-10, see DESIGN.md)", () => {
    const { container } = render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));

    const text = container.textContent ?? "";
    // Real socio names from the curated RUMAX edicto (verified groundtruth,
    // see DESIGN.md's titularidad decision entry) must NEVER render while
    // the feature is parked, regardless of which proveedor row exists.
    expect(text).not.toContain("Juan Esteban Iglesias");
    expect(text).not.toContain("Maximiliano Marcelo Márquez");
    expect(text).not.toMatch(/titularidad registral/i);
    expect(
      screen.queryByRole("button", {
        name: /ver titularidad de equipos de servicios portuarios rumax s\.r\.l/i,
      }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /ver titularidad de/i })).toBeNull();
  });

  it("never renders the titularidad methodology/rectification section while the flag is off", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/metodolog[ií]a y l[ií]mites/i);
    expect(screen.queryByRole("link", { name: /escribinos/i })).toBeNull();
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
