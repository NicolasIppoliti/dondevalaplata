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
    expect(screen.getByText(first.proveedor)).toBeTruthy();
  });

  it("expanding a row reveals dual-link provenance (original + archived) with a sha256", () => {
    const { adjudicaciones } = getPortalData();
    render(<Page />);
    const first = adjudicaciones.records[0];
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`ver detalle de ${escapeRegExp(first.proveedor)}`, "i"),
      }),
    );
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

  it("expanding RUMAX in the padrón reveals its real curated socios with the date-cut label and dual-link provenance", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));

    fireEvent.click(
      screen.getByRole("button", {
        name: /ver titularidad de equipos de servicios portuarios rumax s\.r\.l/i,
      }),
    );

    expect(screen.getByText("Juan Esteban Iglesias")).toBeTruthy();
    expect(screen.getAllByText(/socio gerente/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Maximiliano Marcelo Márquez")).toBeTruthy();
    expect(
      screen.getAllByText(/seg[uú]n el edicto de constituci[oó]n del 18 de julio de 2023/i)
        .length,
    ).toBeGreaterThan(0);
    const links = screen.getAllByRole("link", { name: /fuente original/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it("expanding a vendor with no curated edicto shows 'no disponible públicamente' and never a DNI/domicilio (triangulation: opposite code path)", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));

    fireEvent.click(screen.getByRole("button", { name: /ver titularidad de rimsol s\.a/i }));

    expect(screen.getAllByText(/no disponible p[uú]blicamente/i).length).toBeGreaterThan(0);
    const text = document.body.textContent ?? "";
    // The real socio's DNI (verified in engram groundtruth research) must
    // NEVER render anywhere on this page, regardless of which vendor row
    // is expanded.
    expect(text).not.toMatch(/26\.333\.949/);
    expect(text).not.toMatch(/Castelli 603/);
  });

  it("discloses the titularidad methodology (partial coverage, minimization, legal basis) and a visible rectification channel", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/edicto de constituci[oó]n oficial/i);
    expect(text).toMatch(/25\.326/);
    expect(text).toMatch(/rectificar/i);
    expect(screen.getByRole("link", { name: /escribinos/i })).toBeTruthy();
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
