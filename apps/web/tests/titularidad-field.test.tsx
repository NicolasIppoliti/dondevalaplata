import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TitularidadField } from "@/components/adjudicaciones/TitularidadField";
import type { ProveedorTitularidad } from "@/components/adjudicaciones/TitularidadField";
import type { SourceLink } from "@/lib/sources";

const RUMAX_SOURCE_LINK: SourceLink = {
  id: "edictos-societarios/rumax",
  source: "boletinoficial.gba.gob.ar",
  sourceUrl: "https://boletinoficial.gba.gob.ar/secciones/12309/ver",
  archivedUrl: "https://pub-example.r2.dev/edictos-societarios/rumax.pdf",
  sha256: "ae159a72f801f86a1b0c8f4bee4fc5cf8a94893ad18c5dbca17635883cf68c5b",
  fetchedAt: "2026-07-09T17:10:25Z",
};

const DISPONIBLE: ProveedorTitularidad = {
  status: "disponible",
  record: {
    empresa: "Equipo de Servicios Portuarios Rumax S.R.L.",
    vendorMatchKeys: [
      "EQUIPO DE SERVICIOS PORTUARIOS RUMAX S.R.L",
      "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L",
    ],
    tipo: "S.R.L.",
    cuitEmpresa: null,
    socios: [
      { nombre: "Juan Esteban Iglesias", rol: "socio gerente" },
      { nombre: "Maximiliano Marcelo Márquez", rol: "socio" },
    ],
    fuenteEdictoUrl: "https://boletinoficial.gba.gob.ar/secciones/12309/ver",
    edicionFecha: "2023-07-18",
    edicionLabel:
      "Boletín Oficial de la Provincia de Buenos Aires, edición 18/07/2023 (Año CXIV, Nº 29548), Sección Oficial – Sociedades",
    instrumentoFecha: "2023-06-29",
    instrumentoLabel: "instrumento privado del 29/6/2023",
    sourceRef: "edictos-societarios/rumax",
  },
  sourceLink: RUMAX_SOURCE_LINK,
};

const NO_DISPONIBLE_SA: ProveedorTitularidad = {
  status: "no-disponible",
  noDisponibleReason:
    "es una S.A.: sus accionistas son privados por ley (art. 213, Ley 19.550) y no figuran en un edicto público.",
};

describe("TitularidadField — disponible (RUMAX)", () => {
  it("renders both socios with their exact roles from the edicto", () => {
    render(<TitularidadField proveedor="EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L" titularidad={DISPONIBLE} />);

    expect(screen.getByText("Juan Esteban Iglesias")).toBeTruthy();
    expect(screen.getByText(/socio gerente/i)).toBeTruthy();
    expect(screen.getByText("Maximiliano Marcelo Márquez")).toBeTruthy();
  });

  it("renders the date-cut label ('según el edicto de constitución del...'), never 'dueño actual'/'titular hoy'", () => {
    render(<TitularidadField proveedor="EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L" titularidad={DISPONIBLE} />);

    const text = document.body.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/seg[uú]n el edicto de constituci[oó]n del 18 de julio de 2023/);
    expect(text).not.toMatch(/due[nñ]o actual/);
    expect(text).not.toMatch(/titular hoy/);
    expect(text).toMatch(/puede haber cambiado desde esa fecha/);
  });

  it("MINIMIZATION: never renders a DNI, a street address, or a birth date, even though those fields exist on the real edicto", () => {
    render(<TitularidadField proveedor="EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L" titularidad={DISPONIBLE} />);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/26\.333\.949/); // the real socio's DNI -- must NEVER render
    expect(text).not.toMatch(/Castelli 603/); // the real socio's domicilio -- must NEVER render
    expect(text).not.toMatch(/\bDNI\b/);
    expect(text).not.toMatch(/domicilio/i);
  });

  it("renders dual-link provenance (original + archived) with a sha256", () => {
    render(<TitularidadField proveedor="EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L" titularidad={DISPONIBLE} />);

    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /copia archivada/i })).toBeTruthy();
    expect(screen.getByText(/sha256/i)).toBeTruthy();
  });

  it("CERO ADJETIVOS: never imputes wrongdoing near the titularidad field (triangulation: blocklist scan)", () => {
    render(<TitularidadField proveedor="EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L" titularidad={DISPONIBLE} />);

    const text = document.body.textContent?.toLowerCase() ?? "";
    const blocklist = [
      "corrupci",
      "sospech",
      "acomodo",
      "conflicto de inter",
      "irregular",
      "coima",
      "prebenda",
      "favoritismo",
      "connivencia",
      "testaferro",
      "delito",
    ];
    for (const word of blocklist) {
      expect(text).not.toContain(word);
    }
  });
});

describe("TitularidadField — no disponible (default)", () => {
  it("renders 'no disponible públicamente' with the honest one-line reason, and no socio name", () => {
    render(<TitularidadField proveedor="RIMSOL S.A" titularidad={NO_DISPONIBLE_SA} />);

    expect(screen.getByText(/no disponible p[uú]blicamente/i)).toBeTruthy();
    expect(screen.getByText(/accionistas.*privados por ley/i)).toBeTruthy();
    expect(screen.queryByText(/Iglesias|M[aá]rquez/)).toBeNull();
  });
});
