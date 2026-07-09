import { describe, expect, it } from "vitest";
import { inferUnavailableReason, resolveTitularidad } from "@/lib/titularidad";
import type { TitularidadData, TitularidadRecord } from "@/lib/schemas";

const RUMAX_RECORD: TitularidadRecord = {
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
};

const TITULARIDAD: TitularidadData = {
  generatedAt: "2026-07-09T12:00:00Z",
  sourceRefs: ["edictos-societarios/rumax"],
  records: [RUMAX_RECORD],
};

describe("resolveTitularidad", () => {
  it("matches the municipal-document plural spelling (EQUIPOS) against the edicto's singular record", () => {
    const result = resolveTitularidad(
      "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L",
      TITULARIDAD,
    );
    expect(result).not.toBeNull();
    expect(result?.empresa).toBe("Equipo de Servicios Portuarios Rumax S.R.L.");
  });

  it("matches case- and whitespace-insensitively", () => {
    const result = resolveTitularidad(
      "  equipos   de servicios portuarios rumax s.r.l  ",
      TITULARIDAD,
    );
    expect(result?.sourceRef).toBe("edictos-societarios/rumax");
  });

  it("returns null for a vendor with no curated record (triangulation: a real, different vendor)", () => {
    const result = resolveTitularidad("COMADAR S.R.L", TITULARIDAD);
    expect(result).toBeNull();
  });
});

describe("inferUnavailableReason", () => {
  it("attributes an S.A. vendor's unavailability to private shareholders by law", () => {
    expect(inferUnavailableReason("RIMSOL S.A")).toMatch(/accionistas.*privados/i);
  });

  it("attributes a non-S.A. vendor's unavailability to an unverified edicto (triangulation: different code path)", () => {
    expect(inferUnavailableReason("COMADAR S.R.L")).toMatch(/edicto/i);
    expect(inferUnavailableReason("COMADAR S.R.L")).not.toMatch(/accionistas.*privados/i);
  });
});
