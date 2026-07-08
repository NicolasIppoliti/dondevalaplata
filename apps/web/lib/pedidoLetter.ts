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
  | "personalizado";

export interface PedidoObjetoPreset {
  id: PedidoObjetoPresetId;
  label: string;
  /** `null` when this preset has no single Art. 11 inciso to cite (only
   * "personalizado" -- a custom request may or may not fall under Art. 11,
   * so the letter never guesses a citation the requester didn't confirm). */
  ordenanzaInciso: string | null;
  needsPeriodo: boolean;
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
