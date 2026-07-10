import { formatDateEsAr, formatPeriodEsAr } from "@/lib/format";
import { buildPageMetadata } from "@/lib/seo";
import { getPortalData, shortHash } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "Fuentes y metodología",
  description:
    "Metodología de ajuste por inflación e índice completo de fuentes archivadas por el portal.",
  path: "/fuentes",
});

const CAPABILITY_LABELS = {
  "coparticipacion-viewer": "Coparticipación",
  "htc-fallos": "Fallos del Tribunal de Cuentas",
  ipc: "IPC (INDEC)",
  electoral: "Resultados electorales",
  sibom: "Boletines Oficiales (SIBOM)",
  "mcr-docs": "Gobierno Abierto (mcr.gob.ar)",
  "asap-transparencia": "Índice de Transparencia Fiscal (ASAP)",
} as const;

const CAPABILITY_ORDER = [
  "coparticipacion-viewer",
  "htc-fallos",
  "asap-transparencia",
  "ipc",
  "electoral",
  "sibom",
  "mcr-docs",
] as const;

// One-line intro shown next to each group's summary, before it's expanded
// -- lets a reader decide whether to open a group without opening it first.
const CAPABILITY_INTROS: Record<string, string> = {
  "coparticipacion-viewer":
    "Transferencias mensuales de coparticipación a los 4 municipios.",
  "htc-fallos": "Fallos del Tribunal de Cuentas sobre las cuentas municipales.",
  ipc: "Índice de Precios al Consumidor usado para ajustar por inflación.",
  electoral: "Resultados electorales oficiales.",
  sibom: "Boletines Oficiales municipales.",
  "mcr-docs": "Documentos del portal de Gobierno Abierto del municipio.",
  "asap-transparencia":
    "Informes de ASAP (asociación civil) que miden transparencia fiscal municipal.",
};

export default function FuentesPage() {
  const { manifest, coparticipacion } = getPortalData();

  const byCapability = new Map<string, typeof manifest>();
  for (const record of manifest) {
    const bucket = byCapability.get(record.capability) ?? [];
    bucket.push(record);
    byCapability.set(record.capability, bucket);
  }

  const knownCapabilities = new Set<string>(CAPABILITY_ORDER);
  const orderedCapabilities = [
    ...CAPABILITY_ORDER.filter((capability) => byCapability.has(capability)),
    ...[...byCapability.keys()].filter(
      (capability) => !knownCapabilities.has(capability),
    ),
  ];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿De dónde salen los datos?
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink">
          Todos los datos publicados en este portal provienen de fuentes
          oficiales, archivadas de forma verificable (hash SHA-256) antes de ser
          procesadas. A continuación, la metodología de ajuste por inflación y
          el índice completo de fuentes archivadas.
        </p>
      </section>

      <section
        aria-labelledby="metodologia-heading"
        className="rounded-lg border border-rule bg-surface p-6 shadow-card"
      >
        <h2
          id="metodologia-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Ajuste por inflación
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink">
          Los montos de coparticipación se ajustan con el Índice de Precios al
          Consumidor (IPC) Nivel General Nacional que publica el INDEC, serie{" "}
          <code className="bg-paper px-1 py-0.5 font-mono text-xs">
            {coparticipacion.ipcSeriesId}
          </code>
          . Los valores se expresan en pesos constantes del último mes
          disponible de esa serie ({formatPeriodEsAr(coparticipacion.baseMonth)}
          ): se recalculan hacia adelante para reflejar el poder adquisitivo de
          ese mes.
        </p>
        <p className="mt-3 max-w-[62ch] text-sm text-ink">
          La cifra mensual de coparticipación que muestra el portal es la suma
          de los aproximadamente 28 conceptos que integran esa transferencia
          según la fuente oficial (Coparticipación Bruta, Fondo Educativo,
          Descentralización Tributaria, entre otros), no únicamente el concepto
          &quot;Coparticipación Bruta&quot; — esto refleja el monto total
          efectivamente transferido a cada municipio en el mes.
        </p>
      </section>

      <section aria-labelledby="preservacion-heading">
        <h2
          id="preservacion-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Preservación de las fuentes
        </h2>
        <p className="mt-2 max-w-[62ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft py-3 pl-4 text-sm text-ink">
          Cada fuente se descarga, se verifica con un hash SHA-256 y se guarda
          en un bucket público de Cloudflare R2, que es la copia archivada
          canónica enlazada en el índice de abajo; los documentos de texto
          pequeños también se conservan en el disco del portal para
          reprocesarlos sin depender de la fuente original. Estas copias no se
          versionan en el repositorio de código del portal (por su tamaño y
          porque R2 ya garantiza su durabilidad); lo que sí se versiona es el
          código que las procesa y los datos ya calculados que se publican en el
          sitio.
        </p>
      </section>

      <section aria-labelledby="indice-heading" className="space-y-4">
        <h2
          id="indice-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Índice de fuentes archivadas
        </h2>
        {orderedCapabilities.map((capability) => {
          const records = byCapability.get(capability) ?? [];
          const label =
            CAPABILITY_LABELS[capability as keyof typeof CAPABILITY_LABELS] ??
            capability;
          const intro =
            CAPABILITY_INTROS[capability] ??
            "Fuentes archivadas de esta categoría.";
          return (
            <details
              key={capability}
              className="group rounded-lg border border-rule bg-surface shadow-card"
            >
              <summary className="flex min-h-11 list-none cursor-pointer items-center justify-between gap-3 p-4 font-display text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {/* Accessible heading for screen-reader "jump between
                    headings" navigation -- kept sr-only so sighted users
                    see the label ONCE (in the summary itself). Overriding
                    <summary>'s role to "heading" instead would silence its
                    native expanded/collapsed disclosure announcement, so a
                    separate element is used rather than an ARIA override. */}
                <h3 className="sr-only">{label}</h3>
                <span aria-hidden="true" className="flex items-center gap-2.5">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    className="flex-none text-muted transition-transform duration-200 group-open:rotate-90"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {label}
                </span>
                <span className="font-mono text-sm font-normal text-muted">
                  ({records.length})
                </span>
              </summary>
              <div className="border-t border-rule p-4">
                <p className="text-sm text-muted">{intro}</p>
                <ul className="mt-3 divide-y divide-rule">
                  {records.map((record) => (
                    <li key={record.id} className="py-3">
                      <p className="text-ink">{record.source}</p>
                      <a
                        href={record.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 w-full items-center justify-between gap-3 font-mono text-sm"
                      >
                        Fuente original
                        <span aria-hidden="true">↗</span>
                      </a>
                      {record.archived_url ? (
                        <a
                          href={record.archived_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-rule font-mono text-sm"
                        >
                          Copia archivada
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <p className="flex min-h-11 w-full items-center border-t border-rule font-mono text-sm text-muted">
                          Copia archivada no disponible
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        sha256 {shortHash(record.sha256)} · archivado el{" "}
                        {formatDateEsAr(record.fetched_at.slice(0, 10))}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
