import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AdjudicacionesExplorer } from "@/components/adjudicaciones/AdjudicacionesExplorer";
import type { AdjudicacionRecord, ProveedorRecord } from "@/lib/schemas";
import type { SourceLink } from "@/lib/sources";

function sourceLink(id: string): SourceLink {
  return {
    id,
    source: "sibom.slyt.gba.gob.ar",
    sourceUrl: `https://sibom.slyt.gba.gob.ar/bulletins/1/contents/1`,
    archivedUrl: `https://pub-example.r2.dev/${id}.html`,
    sha256: "689df97fe6f383a136d6a74c88cecce910b8e3f72e1385aa4e8253338aa723a3",
    fetchedAt: "2026-07-08T17:00:00Z",
  };
}

const RECORDS: (AdjudicacionRecord & { sourceLink: SourceLink })[] = [
  {
    decreto: "524/2023",
    fecha: "2023-09-07",
    expediente: "D-79/23",
    proveedor: "SEDARRI SERGIO ARIEL",
    montoArs: 17_760_000,
    procedimiento: "Licitación Privada Nº 4/23",
    objeto: "Hotelería para la delegación rosaleña",
    bulletinNumber: 36,
    sourceRef: "sibom-actos/boletin-036-decreto-524-2023",
    sourceLink: sourceLink("sibom-actos/boletin-036-decreto-524-2023"),
  },
  {
    decreto: "600/2024",
    fecha: "2024-11-19",
    expediente: null,
    proveedor: "RIMSOL S.A",
    montoArs: 561_768_379,
    procedimiento: "Licitación Pública Nº 2/24",
    objeto: "Repavimentación arterias varias",
    bulletinNumber: 46,
    sourceRef: "sibom-actos/boletin-046-decreto-600-2024",
    sourceLink: sourceLink("sibom-actos/boletin-046-decreto-600-2024"),
  },
];

const PROVEEDORES: ProveedorRecord[] = [
  {
    proveedor: "SEDARRI SERGIO ARIEL",
    totalArs: 17_760_000,
    count: 1,
    firstDate: "2023-09-07",
    lastDate: "2023-09-07",
    decretoRefs: ["524/2023"],
  },
  {
    proveedor: "RIMSOL S.A",
    totalArs: 561_768_379,
    count: 1,
    firstDate: "2024-11-19",
    lastDate: "2024-11-19",
    decretoRefs: ["600/2024"],
  },
];

describe("AdjudicacionesExplorer — tabla de adjudicaciones", () => {
  it("renders every record collapsed, with a search box and sortable headers", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    expect(screen.getByRole("searchbox", { name: /buscar/i })).toBeTruthy();
    expect(screen.getByText("SEDARRI SERGIO ARIEL")).toBeTruthy();
    expect(screen.getByText("RIMSOL S.A")).toBeTruthy();
    // Provenance details are not in the DOM until a row is expanded.
    expect(screen.queryByText(/D-79\/23/)).toBeNull();
  });

  it("filters rows by a free-text query (accent-insensitive)", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /buscar/i }), {
      target: { value: "rimsol" },
    });

    expect(screen.getByText("RIMSOL S.A")).toBeTruthy();
    expect(screen.queryByText("SEDARRI SERGIO ARIEL")).toBeNull();
  });

  it("expands a row on click to reveal decreto, expediente, objeto and dual-link provenance", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    fireEvent.click(
      screen.getByRole("button", { name: /ver detalle de SEDARRI SERGIO ARIEL/i }),
    );

    expect(screen.getByText(/D-79\/23/)).toBeTruthy();
    expect(screen.getByText(/Licitación Privada/)).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /fuente original/i });
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getByText(/sha256/i)).toBeTruthy();
  });

  it("sorts by montoArs descending (biggest first) when the amount header is clicked", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    const montoHeader = screen.getByRole("columnheader", { name: /monto/i });
    fireEvent.click(within(montoHeader).getByRole("button"));

    const rows = screen.getAllByRole("row").slice(1); // skip header row
    expect(within(rows[0]).getByText("RIMSOL S.A")).toBeTruthy();
  });

  it("sorts by montoArs ascending (smallest first) on a second click", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    const montoHeader = screen.getByRole("columnheader", { name: /monto/i });
    fireEvent.click(within(montoHeader).getByRole("button"));
    fireEvent.click(within(montoHeader).getByRole("button"));

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("SEDARRI SERGIO ARIEL")).toBeTruthy();
  });
});

describe("AdjudicacionesExplorer — padrón de proveedores", () => {
  it("switches to the padrón view and shows aggregated totals", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));

    expect(screen.getByText(/reconstruido a partir del bolet/i)).toBeTruthy();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("RIMSOL S.A")).toBeTruthy();
  });

  it("clicking a proveedor switches back to the adjudicaciones tab filtered to that vendor", () => {
    render(<AdjudicacionesExplorer records={RECORDS} proveedores={PROVEEDORES} />);

    fireEvent.click(screen.getByRole("tab", { name: /padrón de proveedores/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /ver adjudicaciones de RIMSOL S.A/i }),
    );

    expect(
      screen.getByRole("tab", { name: /^adjudicaciones$/i }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("RIMSOL S.A")).toBeTruthy();
    expect(screen.queryByText("SEDARRI SERGIO ARIEL")).toBeNull();
  });
});
