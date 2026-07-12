import { describe, expect, it } from "vitest";
import {
  generatePedidoText,
  PEDIDO_PRESETS,
  type PedidoFormInput,
} from "@/lib/pedidoLetter";

/**
 * Feature G4: the pedido de acceso a la información letter generator.
 * Written TDD-first. This is 100% client-side text assembly -- no network
 * call, no PII leaves the browser (see `components/pedidos/PedidoGenerator.tsx`)
 * -- so the pure function itself is the right place to lock down the legal
 * citations (Ordenanza 3638 Arts. 2, 6, 11) and never silently drop a field.
 */
const BASE_INPUT: PedidoFormInput = {
  objetoPreset: "detalle-gastos",
  periodo: "1er trimestre 2026",
  destinatario: "ejecutivo",
  nombreCompleto: "Juana Pérez",
  dni: "30123456",
  domicilioReal: "Calle Falsa 123, Punta Alta",
  domicilioConstituido: "Av. Siempreviva 742, Punta Alta",
  email: "juana@example.com",
};

describe("PEDIDO_PRESETS", () => {
  it("exposes exactly the 9 presets the generator form offers", () => {
    expect(PEDIDO_PRESETS.map((p) => p.id)).toEqual([
      "detalle-gastos",
      "ordenes-compra",
      "padron-proveedores",
      "escala-salarial",
      "dotacion-personal",
      "fondo-financiamiento-educativo",
      "tasa-seguridad-higiene",
      "obra-sum-cindi",
      "personalizado",
    ]);
  });

  it("only the period-scoped presets need a periodo field", () => {
    const needsPeriodo = PEDIDO_PRESETS.filter((p) => p.needsPeriodo).map((p) => p.id);
    expect(needsPeriodo).toEqual(["detalle-gastos", "ordenes-compra"]);
  });

  it("personalizado has no specific Art. 11 inciso to cite", () => {
    const personalizado = PEDIDO_PRESETS.find((p) => p.id === "personalizado");
    expect(personalizado?.ordenanzaInciso).toBeNull();
  });
});

describe("generatePedidoText", () => {
  it("cites Ordenanza 3638 and Arts. 2 and 6 in every letter", () => {
    const text = generatePedidoText(BASE_INPUT, "2026-07-08");
    expect(text).toContain("Ordenanza N° 3638");
    expect(text).toMatch(/Art[ií]culo 2/);
    expect(text).toMatch(/Art[ií]culo 6/);
  });

  it("cites the correct Art. 11 inciso for the detalle-gastos preset, with the periodo substituted", () => {
    const text = generatePedidoText(BASE_INPUT, "2026-07-08");
    expect(text).toContain("Art. 11 inciso a)");
    expect(text).toContain("1er trimestre 2026");
  });

  it("cites Art. 11 inciso b) for the padrón de proveedores preset", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "padron-proveedores" },
      "2026-07-08",
    );
    expect(text).toContain("Art. 11 inciso b)");
    expect(text.toLowerCase()).toContain("padrón completo de proveedores");
  });

  it("cites Art. 11 inciso c) for the escala salarial preset", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "escala-salarial" },
      "2026-07-08",
    );
    expect(text).toContain("Art. 11 inciso c)");
  });

  it("cites Art. 11 inciso c) for the dotación de personal preset, requesting cantidad of agentes/cargos por área (not salarios)", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "dotacion-personal" },
      "2026-07-08",
    );
    expect(text).toContain("Art. 11 inciso c)");
    expect(text.toLowerCase()).toContain("dotación de personal");
    expect(text.toLowerCase()).toMatch(/planta permanente/);
    expect(text.toLowerCase()).toMatch(/planta temporaria|contratad/);
  });

  it("cites Art. 11 inciso a) for the Fondo de Financiamiento Educativo preset, requesting the 2023-2026 breakdown and the 40% infraestructura escolar floor", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "fondo-financiamiento-educativo" },
      "2026-07-08",
    );
    expect(text).toContain("Art. 11 inciso a)");
    expect(text.toLowerCase()).toContain("fondo de financiamiento educativo");
    expect(text).toContain("art. 7 de la Ley Nacional 26.075");
    expect(text).toContain("2023, 2024, 2025 y 2026");
    expect(text).toContain("Resolución 292/2024 de la DGCyE");
    expect(text.toLowerCase()).toContain("infraestructura escolar");
  });

  it("never cites a specific Art. 11 inciso for the Tasa de Seguridad e Higiene preset, and requests only aggregate figures", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "tasa-seguridad-higiene" },
      "2026-07-08",
    );
    expect(text).not.toMatch(/Art\. 11 inciso/);
    expect(text.toLowerCase()).toContain(
      "tasa por inspección de seguridad e higiene",
    );
    expect(text).toContain("2022, 2023, 2024 y 2025");
    expect(text.toLowerCase()).toContain("monto total recaudado");
    expect(text.toLowerCase()).toContain("participación porcentual");
  });

  it("never cites a specific Art. 11 inciso for the obra del SUM para CINDI preset, and asks for the execution instrument without naming any company", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "obra-sum-cindi" },
      "2026-07-08",
    );
    expect(text).not.toMatch(/Art\. 11 inciso/);
    expect(text).toContain(
      "Salón de Usos Múltiples (SUM) para CINDI",
    );
    expect(text).toContain("Colón al 200");
    expect(text.toLowerCase()).toContain("licitación, convenio, u otro");
    expect(text.toLowerCase()).toContain("cesión del terreno");
  });

  it("never cites a specific Art. 11 inciso for the personalizado preset, and uses the custom text", () => {
    const text = generatePedidoText(
      {
        ...BASE_INPUT,
        objetoPreset: "personalizado",
        objetoPersonalizado: "el listado de convenios urbanísticos vigentes",
      },
      "2026-07-08",
    );
    expect(text).not.toMatch(/Art\. 11 inciso/);
    expect(text).toContain("el listado de convenios urbanísticos vigentes");
  });

  it("addresses the Departamento Ejecutivo when destinatario is 'ejecutivo'", () => {
    const text = generatePedidoText(BASE_INPUT, "2026-07-08");
    expect(text).toMatch(/Intendente/i);
    expect(text).toContain("Mesa de Entradas de la Municipalidad de Coronel Rosales");
  });

  it("addresses the HCD when destinatario is 'hcd'", () => {
    const text = generatePedidoText({ ...BASE_INPUT, destinatario: "hcd" }, "2026-07-08");
    expect(text).toMatch(/Concejo Deliberante/i);
    expect(text).toContain("Mesa de Entradas del Honorable Concejo Deliberante de Coronel Rosales");
  });

  it("includes every personal-data field required by Art. 6", () => {
    const text = generatePedidoText(BASE_INPUT, "2026-07-08");
    expect(text).toContain("Juana Pérez");
    expect(text).toContain("30123456");
    expect(text).toContain("Calle Falsa 123, Punta Alta");
    expect(text).toContain("Av. Siempreviva 742, Punta Alta");
    expect(text).toContain("juana@example.com");
  });

  it("renders explicit bracket placeholders for missing required fields instead of blanks or 'undefined'", () => {
    const text = generatePedidoText(
      { objetoPreset: "detalle-gastos", destinatario: "ejecutivo" } as PedidoFormInput,
      "2026-07-08",
    );
    expect(text).not.toMatch(/undefined/i);
    expect(text).toMatch(/\[COMPLETAR NOMBRE/i);
    expect(text).toMatch(/\[COMPLETAR DNI\]/i);
    expect(text).toMatch(/\[COMPLETAR DOMICILIO REAL\]/i);
    expect(text).toMatch(/\[COMPLETAR DOMICILIO CONSTITUIDO/i);
    expect(text).toMatch(/\[COMPLETAR EMAIL\]/i);
  });

  it("formats the letter date in es-AR prose", () => {
    const text = generatePedidoText(BASE_INPUT, "2026-07-08");
    expect(text).toContain("Coronel Rosales, 8 de julio de 2026");
  });

  it("never leaves the literal string 'undefined' anywhere in the output for any preset", () => {
    for (const preset of PEDIDO_PRESETS) {
      const text = generatePedidoText(
        { ...BASE_INPUT, objetoPreset: preset.id, periodo: undefined },
        "2026-07-08",
      );
      expect(text.toLowerCase()).not.toContain("undefined");
    }
  });
});

/**
 * Neutrality guard (Ordenanza 3638 presets): every objeto text must stay
 * factual and non-accusatory -- a pedido asks a public body to disclose
 * information it should already publish, it never accuses anyone of
 * wrongdoing. Same doctrine as `tests/titularidad-field.test.tsx`'s
 * "CERO ADJETIVOS" blocklist guard, applied here to the full generated
 * letter for every preset (not just the 3 new ones added for this batch).
 */
describe("Neutrality guard — no accusatory or imputation language in any preset", () => {
  const BLOCKLIST = [
    "estafa",
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
    "fraude",
    "malversaci",
    "sin licitaci",
  ];

  it("no generated letter, for any preset, contains a blocklisted accusatory word", () => {
    for (const preset of PEDIDO_PRESETS) {
      const text = generatePedidoText(
        { ...BASE_INPUT, objetoPreset: preset.id },
        "2026-07-08",
      ).toLowerCase();
      for (const word of BLOCKLIST) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("the obra del SUM para CINDI preset never names a private company or person", () => {
    const text = generatePedidoText(
      { ...BASE_INPUT, objetoPreset: "obra-sum-cindi" },
      "2026-07-08",
    );
    // The objeto text may only mention public entities (Municipio, Provincia) --
    // never a private contractor/company name, which the source investigation
    // deliberately withheld from this preset's wording.
    expect(text).not.toMatch(/\bS\.?A\.?\b|\bS\.?R\.?L\.?\b/);
  });
});
