import Link from "next/link";
import { formatArsCompact, formatPeriodEsAr } from "@/lib/format";
import { getPortalData, resolveSourceRef } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

export default function Home() {
  const { coparticipacion, fallos, manifest } = getPortalData();

  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const latestPoint = coronelRosales?.points.at(-1);
  const coparticipacionLink = resolveSourceRef(
    "coparticipacion/transferencias-municipios",
    manifest,
  );

  const latestEjercicio = fallos.records.reduce(
    (max, record) => (record.ejercicio > max ? record.ejercicio : max),
    fallos.records[0].ejercicio,
  );
  const latestFallo = fallos.records
    .filter((record) => record.ejercicio === latestEjercicio)
    .reduce((top, record) =>
      (record.fineArs ?? 0) > (top.fineArs ?? 0) ? record : top,
    );
  const falloLink = resolveSourceRef(latestFallo.sourceRefs[0], manifest);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          ¿Dónde va la plata? — Coronel Rosales
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Datos públicos de coparticipación municipal y fallos del Tribunal de
          Cuentas de la Provincia de Buenos Aires referidos a Coronel Rosales.
          Cada cifra publicada enlaza a su fuente oficial y a una copia
          archivada del documento original. Sitio ciudadano independiente, sin
          fines partidarios.
        </p>
      </section>

      <section aria-label="Cifras destacadas" className="grid gap-6 sm:grid-cols-2">
        {latestPoint ? (
          <article className="rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Coparticipación — Coronel Rosales
            </h2>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatArsCompact(latestPoint.realArs)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatPeriodEsAr(latestPoint.period)}, en pesos constantes de{" "}
              {formatPeriodEsAr(coparticipacion.baseMonth)} (IPC INDEC nivel
              general nacional, serie {coparticipacion.ipcSeriesId}).
            </p>
            <p className="mt-3 flex flex-wrap gap-x-2 text-sm">
              <a
                href={coparticipacionLink.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Fuente original
              </a>
              <span aria-hidden="true">·</span>
              {coparticipacionLink.archivedUrl ? (
                <a
                  href={coparticipacionLink.archivedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Copia archivada
                </a>
              ) : (
                <span>Copia archivada no disponible</span>
              )}
            </p>
            <Link
              href="/coparticipacion"
              className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
            >
              Ver serie completa y comparación con municipios vecinos →
            </Link>
          </article>
        ) : null}

        <article className="rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Fallos del Tribunal de Cuentas — ejercicio {latestEjercicio}
          </h2>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatArsCompact(latestFallo.fineArs ?? 0)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Multa a {latestFallo.official} ({latestFallo.role}), fallo
            {latestFallo.scanned
              ? " (documento escaneado, texto no extraído)"
              : ""}
            .
          </p>
          <p className="mt-3 flex flex-wrap gap-x-2 text-sm">
            <a
              href={falloLink.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Fuente original
            </a>
            <span aria-hidden="true">·</span>
            {falloLink.archivedUrl ? (
              <a
                href={falloLink.archivedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Copia archivada
              </a>
            ) : (
              <span>Copia archivada no disponible</span>
            )}
          </p>
          <Link
            href="/fallos"
            className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
          >
            Ver los fallos 2022-2024 →
          </Link>
        </article>
      </section>
    </div>
  );
}
