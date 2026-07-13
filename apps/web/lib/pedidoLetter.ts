import { formatDateEsAr } from "./format";

/**
 * Feature G4: assembles a formal pedido de acceso a la información pública
 * under Ordenanza 3638 (Coronel Rosales) as plain text, entirely in the
 * browser. No network request, no server -- see
 * `components/pedidos/PedidoGenerator.tsx` for the "nada de esto sale de tu
 * navegador" guarantee this module makes possible: everything it needs is
 * the caller's own form state plus the letter's date, both supplied as
 * plain arguments.
 *
 * Legal basis (verified, see the project's own `data/gap-100-y-detalle-gasto`
 * research note): Art. 2 (anyone may request, from the Departamento
 * Ejecutivo and/or the HCD), Art. 6 (form: petitioner identity + domicilio
 * real + domicilio CONSTITUIDO within Coronel Rosales + objeto preciso +
 * right to request a digital copy), Art. 11 (already obliges the official
 * site to publish gastos de compras/contrataciones, padrón de proveedores
 * and gastos de personal -- cited only for the 4 presets it actually
 * covers, never for "personalizado").
 */

export type PedidoObjetoPresetId =
  | "detalle-gastos"
  | "ordenes-compra"
  | "padron-proveedores"
  | "escala-salarial"
  | "dotacion-personal"
  | "fondo-financiamiento-educativo"
  | "tasa-seguridad-higiene"
  | "obra-sum-cindi"
  | "confirmar-deuda-q4-2025"
  | "personalizado";

export interface PedidoObjetoPreset {
  id: PedidoObjetoPresetId;
  label: string;
  /** `null` when this preset has no single Art. 11 inciso to cite -- either
   * because it's "personalizado" (a custom request may or may not fall
   * under Art. 11, so the letter never guesses a citation the requester
   * didn't confirm), or because the request targets something Art. 11
   * doesn't already oblige the site to publish (e.g. aggregate tax
   * revenue, or a clarification about one specific obra's execution
   * instrument) -- see `tasa-seguridad-higiene` and `obra-sum-cindi`. */
  ordenanzaInciso: string | null;
  needsPeriodo: boolean;
  /** Optional one-line neutral clarification shown in the UI next to the
   * preset (e.g. "this only asks for aggregate figures"). Never legal
   * boilerplate -- purely a UX note, omitted from the generated letter
   * itself. */
  helperNote?: string;
}

export const PEDIDO_PRESETS: readonly PedidoObjetoPreset[] = [
  {
    id: "detalle-gastos",
    label: "Detalle de ejecución de gastos del período",
    ordenanzaInciso: "Art. 11 inciso a)",
    needsPeriodo: true,
  },
  {
    id: "ordenes-compra",
    label: "Órdenes de compra y contrataciones (proveedor, monto, objeto y fecha)",
    ordenanzaInciso: "Art. 11 inciso a)",
    needsPeriodo: true,
  },
  {
    id: "padron-proveedores",
    label: "Padrón de proveedores",
    ordenanzaInciso: "Art. 11 inciso b)",
    needsPeriodo: false,
  },
  {
    id: "escala-salarial",
    label: "Escala salarial y gastos de personal",
    ordenanzaInciso: "Art. 11 inciso c)",
    needsPeriodo: false,
  },
  {
    id: "dotacion-personal",
    label:
      "Dotación de personal por área (cantidad de agentes/cargos por secretaría, planta permanente y temporaria)",
    ordenanzaInciso: "Art. 11 inciso c)",
    needsPeriodo: false,
  },
  {
    id: "fondo-financiamiento-educativo",
    label:
      "Aplicación del Fondo de Financiamiento Educativo (ejercicios 2023-2026)",
    ordenanzaInciso: "Art. 11 inciso a)",
    needsPeriodo: false,
  },
  {
    id: "tasa-seguridad-higiene",
    label:
      "Recaudación de la Tasa de Seguridad e Higiene (datos agregados, ejercicios 2022-2025)",
    ordenanzaInciso: null,
    needsPeriodo: false,
    helperNote:
      "Pide solo cifras agregadas (monto total y porcentaje) -- nunca datos de un contribuyente en particular, así que no afecta el secreto fiscal.",
  },
  {
    id: "obra-sum-cindi",
    label: "Obra del SUM para CINDI (instrumento de ejecución)",
    ordenanzaInciso: null,
    needsPeriodo: false,
    helperNote:
      "Esta obra aparece financiada por la Provincia; el pedido busca confirmar cómo se ejecuta y quién la financia, no es una denuncia.",
  },
  {
    id: "confirmar-deuda-q4-2025",
    label: "Confirmar el Stock de Deuda del 4to trimestre 2025 (dato inconsistente)",
    ordenanzaInciso: null,
    needsPeriodo: false,
    helperNote:
      "Pide que el municipio confirme o corrija un valor que ya publicó -- no es información nueva: el Stock de Deuda declarado para el 4to trimestre de 2025 no resulta consistente con los trimestres vecinos de la misma serie.",
  },
  {
    id: "personalizado",
    label: "Otro (redactar el objeto vos mismo/a)",
    ordenanzaInciso: null,
    needsPeriodo: false,
  },
] as const;

export type PedidoDestinatario = "ejecutivo" | "hcd";

export interface PedidoFormInput {
  objetoPreset: PedidoObjetoPresetId;
  /** Only used by the "detalle-gastos"/"ordenes-compra" presets. */
  periodo?: string;
  /** Only used by the "personalizado" preset. */
  objetoPersonalizado?: string;
  destinatario: PedidoDestinatario;
  nombreCompleto?: string;
  dni?: string;
  domicilioReal?: string;
  domicilioConstituido?: string;
  email?: string;
}

const DESTINATARIO_INFO: Record<
  PedidoDestinatario,
  { salutation: string; mesaEntradas: string }
> = {
  ejecutivo: {
    salutation: "Sr./Sra. Intendente/a Municipal de Coronel Rosales",
    mesaEntradas: "Mesa de Entradas de la Municipalidad de Coronel Rosales",
  },
  hcd: {
    salutation:
      "Sr./Sra. Presidente/a del Honorable Concejo Deliberante de Coronel Rosales",
    mesaEntradas: "Mesa de Entradas del Honorable Concejo Deliberante de Coronel Rosales",
  },
};

function withPlaceholder(value: string | undefined, placeholder: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : placeholder;
}

function buildObjetoText(
  presetId: PedidoObjetoPresetId,
  periodo: string | undefined,
  objetoPersonalizado: string | undefined,
): string {
  const periodoTrimmed = periodo?.trim();
  switch (presetId) {
    case "detalle-gastos":
      return `el detalle de ejecución de gastos correspondiente al ${
        periodoTrimmed || "período que se indique"
      }, discriminado por partida, proveedor, monto y fecha de cada erogación`;
    case "ordenes-compra":
      return `el listado completo de órdenes de compra y contrataciones ${
        periodoTrimmed
          ? `del ${periodoTrimmed}`
          : "vigentes y/o del período que se indique"
      }, con el detalle de proveedor, monto, objeto y fecha de cada una`;
    case "padron-proveedores":
      return "el padrón completo de proveedores del municipio";
    case "escala-salarial":
      return "el detalle de la escala salarial vigente y los gastos de contratación de personal del municipio";
    case "dotacion-personal":
      return "el detalle de la dotación de personal vigente del municipio, discriminada por área/secretaría, cargo y tipo de vinculación (planta permanente y planta temporaria/contratada)";
    case "fondo-financiamiento-educativo":
      return "el detalle de aplicación del Fondo de Financiamiento Educativo (afectación específica del art. 7 de la Ley Nacional 26.075) percibido por el Municipio en los ejercicios 2023, 2024, 2025 y 2026: (a) monto total percibido por año; (b) imputación de su aplicación por objeto del gasto y por finalidad y función; (c) porcentaje efectivamente ejecutado en infraestructura escolar, a fin de verificar el cumplimiento del piso mínimo del 40% previsto para los municipios no conurbano por la Resolución 292/2024 de la DGCyE; y (d) copia de los convenios y rendiciones de aplicación del fondo presentadas ante la Provincia";
    case "tasa-seguridad-higiene":
      return "el monto total recaudado por la Tasa por Inspección de Seguridad e Higiene en los ejercicios 2022, 2023, 2024 y 2025, y su participación porcentual en el total de recursos tributarios municipales de cada año";
    case "obra-sum-cindi":
      return "información respecto de la obra 'Construcción del Salón de Usos Múltiples (SUM) para CINDI' (terreno de calle Colón al 200, Punta Alta), en particular: (a) bajo qué instrumento se ejecuta la obra (licitación, convenio, u otro) y qué organismo la financia y contrata; (b) si el Municipio aporta fondos propios además de la cesión del terreno; y (c) copia del convenio o acto administrativo por el cual el Municipio cedió el terreno y de cualquier instrumento municipal vinculado a la obra";
    case "confirmar-deuda-q4-2025":
      return 'que el Departamento Ejecutivo confirme o, en caso de corresponder, rectifique el valor de $ 1.826.113.416,70 consignado como "1. Deuda Pública / Saldo" (Stock de Deuda) correspondiente al 4to trimestre de 2025, dado que dicho monto no resulta consistente con los valores publicados para los trimestres inmediatamente anterior y posterior de la misma serie ($ 46.876.896,86 al 3er trimestre de 2025 y $ 169.183.140,12 al 1er trimestre de 2026, respectivamente)';
    case "personalizado": {
      const custom = objetoPersonalizado?.trim();
      return custom || "[COMPLETAR EL OBJETO DE TU PEDIDO]";
    }
  }
}

/**
 * Assembles the full pedido letter as plain text. `fechaISO` is the letter's
 * own date (the day the requester generates/prints it) -- always supplied
 * explicitly by the caller (never `Date.now()` inside this pure function),
 * so it stays trivially testable and never depends on when the module
 * happens to be evaluated.
 */
export function generatePedidoText(input: PedidoFormInput, fechaISO: string): string {
  const preset =
    PEDIDO_PRESETS.find((p) => p.id === input.objetoPreset) ?? PEDIDO_PRESETS[0];
  const objetoText = buildObjetoText(
    input.objetoPreset,
    input.periodo,
    input.objetoPersonalizado,
  );
  const destinatarioInfo = DESTINATARIO_INFO[input.destinatario];
  const fechaProsa = formatDateEsAr(fechaISO);

  const nombreCompleto = withPlaceholder(
    input.nombreCompleto,
    "[COMPLETAR NOMBRE Y APELLIDO]",
  );
  const dni = withPlaceholder(input.dni, "[COMPLETAR DNI]");
  const domicilioReal = withPlaceholder(
    input.domicilioReal,
    "[COMPLETAR DOMICILIO REAL]",
  );
  const domicilioConstituido = withPlaceholder(
    input.domicilioConstituido,
    "[COMPLETAR DOMICILIO CONSTITUIDO EN CORONEL ROSALES]",
  );
  const email = withPlaceholder(input.email, "[COMPLETAR EMAIL]");

  const art11Clause = preset.ordenanzaInciso
    ? `\n\nCabe señalar que la publicación de esta información ya constituye una obligación vigente del Departamento Ejecutivo conforme el ${preset.ordenanzaInciso} de la Ordenanza N° 3638, por lo que la presente solicitud procura el cumplimiento de una obligación legal ya establecida.`
    : "";

  return `Coronel Rosales, ${fechaProsa}

${destinatarioInfo.salutation}
${destinatarioInfo.mesaEntradas}
Municipalidad de Coronel Rosales
S / D

Ref.: Solicitud de acceso a la información pública — Ordenanza N° 3638

De mi consideración:

Me dirijo a usted en mi carácter de vecino/a de este Partido, en ejercicio del derecho de acceso a la información pública que reconoce la Ordenanza N° 3638 (sancionada el 14/03/2017, promulgada el 16/03/2017) en su Artículo 2°, a fin de solicitar formalmente:

${objetoText}.${art11Clause}

Solicito asimismo se me extienda copia digital de la información requerida, conforme lo previsto en el Artículo 6° de la Ordenanza N° 3638.

A los efectos de la presente, constituyo domicilio en:
${domicilioConstituido} (Coronel Rosales).

Mis datos personales, conforme el Artículo 6° de la citada norma, son los siguientes:

Nombre y apellido: ${nombreCompleto}
DNI: ${dni}
Domicilio real: ${domicilioReal}
Correo electrónico: ${email}

Sin otro particular, saludo a usted atentamente.


_______________________________
Firma

Aclaración: ${nombreCompleto}
DNI: ${dni}`;
}
