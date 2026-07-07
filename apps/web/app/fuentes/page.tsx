import type { Metadata } from "next";
import { formatDateEsAr, formatPeriodEsAr } from "@/lib/format";
import { getPortalData, shortHash } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Fuentes y metodología",
  description:
    "Metodología de ajuste por inflación e índice completo de fuentes archivadas por el portal.",
};

const CAPABILITY_LABELS = {
  "coparticipacion-viewer": "Coparticipación",
  "htc-fallos": "Fallos del Tribunal de Cuentas",
  ipc: "IPC (INDEC)",
  electoral: "Resultados electorales",
  sibom: "Boletines Oficiales (SIBOM)",
  "mcr-docs": "Gobierno Abierto (mcr.gob.ar)",
} as const;

const CAPABILITY_ORDER = [
  "coparticipacion-viewer",
  "htc-fallos",
  "ipc",
  "electoral",
  "sibom",
  "mcr-docs",
] as const;

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
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Fuentes y metodología
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Todos los datos publicados en este portal provienen de fuentes
          oficiales, archivadas de forma verificable (hash SHA-256) antes de
          ser procesadas. A continuación, la metodología de ajuste por
          inflación y el índice completo de fuentes archivadas.
        </p>
      </section>

      <section aria-labelledby="metodologia-heading">
        <h2
          id="metodologia-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Ajuste por inflación
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700">
          Los montos de coparticipación se ajustan con el Índice de Precios
          al Consumidor (IPC) Nivel General Nacional que publica el INDEC,
          serie{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {coparticipacion.ipcSeriesId}
          </code>
          . Los valores se expresan en pesos constantes del último mes
          disponible de esa serie ({formatPeriodEsAr(coparticipacion.baseMonth)}
          ): se recalculan hacia adelante para reflejar el poder adquisitivo
          de ese mes.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-700">
          La cifra mensual de coparticipación que muestra el portal es la
          suma de los aproximadamente 28 conceptos que integran esa
          transferencia según la fuente oficial (Coparticipación Bruta,
          Fondo Educativo, Descentralización Tributaria, entre otros), no
          únicamente el concepto &quot;Coparticipación Bruta&quot; —
          esto refleja el monto total efectivamente transferido a cada
          municipio en el mes.
        </p>
      </section>

      <section aria-labelledby="preservacion-heading">
        <h2
          id="preservacion-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Preservación de las fuentes
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700">
          Cada fuente se descarga, se verifica con un hash SHA-256 y se
          guarda en un bucket público de Cloudflare R2, que es la copia
          archivada canónica enlazada en el índice de abajo; los
          documentos de texto pequeños también se conservan en el disco
          del portal para reprocesarlos sin depender de la fuente
          original. Estas copias no se versionan en el repositorio de
          código del portal (por su tamaño y porque R2 ya garantiza su
          durabilidad); lo que sí se versiona es el código que las
          procesa y los datos ya calculados que se publican en el sitio.
        </p>
      </section>

      <section aria-labelledby="indice-heading" className="space-y-8">
        <h2
          id="indice-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Índice de fuentes archivadas
        </h2>
        {orderedCapabilities.map((capability) => {
          const records = byCapability.get(capability) ?? [];
          const label =
            CAPABILITY_LABELS[capability as keyof typeof CAPABILITY_LABELS] ??
            capability;
          return (
            <div key={capability}>
              <h3 className="text-lg font-semibold text-slate-900">
                {label}{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({records.length})
                </span>
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    Fuentes archivadas — {label}
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        Fuente
                      </th>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        Enlaces
                      </th>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        sha256
                      </th>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        Archivado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-slate-200 align-top"
                      >
                        <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                          {record.source}
                        </th>
                        <td className="py-1.5 pr-4">
                          <a
                            href={record.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            Fuente original
                          </a>
                          {" · "}
                          {record.archived_url ? (
                            <a
                              href={record.archived_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2"
                            >
                              Copia archivada
                            </a>
                          ) : (
                            <span>Copia archivada no disponible</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4 font-mono text-xs">
                          {shortHash(record.sha256)}
                        </td>
                        <td className="py-1.5 pr-4">
                          {formatDateEsAr(record.fetched_at.slice(0, 10))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
