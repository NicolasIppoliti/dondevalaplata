import Link from "next/link";
import { formatDateEsAr } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { CadenciaDeuda } from "@/lib/schemas";

/**
 * DeudaCounter (feature G1): a prominent, factual widget about the
 * municipality's published stock-de-deuda -- days/quarters elapsed since
 * the last publication when there IS a gap (`quartersMissing > 0`), or the
 * current figure stated neutrally when the series is up to date
 * (`quartersMissing === 0`). Full variant also shows the legal hook:
 * Ordenanza 3638 (Acceso a la Información Pública de Coronel Rosales), Art.
 * 11, which requires this information to be published. Dual-link
 * provenance + short sha256, same pattern as every other headline figure
 * on the portal (DESIGN.md INVIOLABLE rule #2).
 *
 * Every number here comes from `data/cadencia.json`, itself computed at
 * ETL build time -- `elapsedDays`/`quartersMissing` are NOT derived from
 * `Date.now()` at render, so this component renders identically whether
 * server-rendered at build time or hydrated later, and never breaks
 * static prerendering.
 *
 * Neutrality note: when there IS a gap, this states a documented fact
 * about a PUBLICATION CADENCE (the municipality has not published a newer
 * figure yet), never an evaluation of a person or gestión -- framed with
 * the `--ocre` "aviso documental" token DESIGN.md's Alerts pattern
 * reserves for this exact case, never `--stamp`/alarm-red. When the series
 * is current, the component must NOT assert a gap that no longer exists
 * (would be factually false) -- it renders on a plain surface instead,
 * same convention `CadenceDashboard` already uses for full-mark items.
 *
 * `historicoHref` (feature H2a, optional): when given, renders a "Ver
 * serie histórica →" link into the deuda pública histórica chart
 * (`DeudaHistoricaChart`) -- the counter states the CURRENT status, the
 * histórica chart shows the full series (+ any gap) visually. Omitted on
 * the compact home variant's typical caller unless explicitly passed;
 * never rendered when absent, so every pre-existing caller is
 * byte-identical.
 */
interface DeudaCounterProps {
  deuda: CadenciaDeuda;
  sourceLinks: SourceLink[];
  compact?: boolean;
  historicoHref?: string;
}

export function DeudaCounter({
  deuda,
  sourceLinks,
  compact = false,
  historicoHref,
}: DeudaCounterProps) {
  const hasGap = deuda.quartersMissing > 0;

  return (
    <section
      aria-labelledby="deuda-counter-heading"
      className={
        hasGap
          ? "rounded-lg border border-ocre border-l-[5px] bg-ocre-soft p-5 shadow-card"
          : "rounded-lg border border-rule bg-surface p-5 shadow-card"
      }
    >
      <h2
        id="deuda-counter-heading"
        className={
          compact
            ? "font-display text-base font-semibold text-ink"
            : "font-display text-xl font-semibold text-ink"
        }
      >
        {hasGap ? (
          <>
            El municipio no actualiza su stock de deuda pública desde el{" "}
            {formatDateEsAr(deuda.lastPeriodEnd)}
          </>
        ) : (
          <>Stock de deuda pública al {formatDateEsAr(deuda.lastPeriodEnd)}</>
        )}
      </h2>

      {hasGap ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-mono text-ink tabular-nums">
          <span className={compact ? "text-3xl font-semibold" : "text-4xl font-semibold"}>
            {deuda.elapsedDays}
          </span>
          <span className="text-sm text-ink-2">
            días sin actualizar · {deuda.quartersMissing} trimestres sin publicar
          </span>
        </p>
      ) : (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-mono text-ink tabular-nums">
          <span className={compact ? "text-3xl font-semibold" : "text-4xl font-semibold"}>
            {deuda.lastFigureLabel}
          </span>
        </p>
      )}

      <p className="mt-2 text-sm text-ink-2">
        Último dato publicado: <strong className="text-ink">{deuda.lastPeriod}</strong>{" "}
        (cierre {formatDateEsAr(deuda.lastPeriodEnd)}), por un total de{" "}
        <strong className="font-mono text-ink tabular-nums">
          {deuda.lastFigureLabel}
        </strong>
        .
      </p>

      {historicoHref ? (
        <p className="mt-2">
          <Link
            href={historicoHref}
            className="font-mono text-sm font-semibold text-ink no-underline hover:text-stamp"
          >
            Ver serie histórica <span aria-hidden="true">→</span>
          </Link>
        </p>
      ) : null}

      {!compact ? (
        <>
          <p className="mt-3 max-w-[64ch] text-sm text-ink-2">
            {hasGap ? (
              <>
                {deuda.ordenanzaRef}, {deuda.ordenanzaArticle}, ya obliga a
                publicar esta información en la web oficial. {deuda.ordenanzaNote}
              </>
            ) : (
              <>
                {deuda.ordenanzaRef}, {deuda.ordenanzaArticle}, exige que esta
                información esté publicada en la web oficial — y lo está.{" "}
                {deuda.ordenanzaNote}
              </>
            )}
          </p>

          <ul className="mt-4 space-y-2">
            {sourceLinks.map((link) => (
              <li key={link.id} className="font-mono text-[11.5px] break-all text-muted">
                <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Fuente original
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>{" "}
                ·{" "}
                {link.archivedUrl ? (
                  <a href={link.archivedUrl} target="_blank" rel="noopener noreferrer">
                    Copia archivada
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                ) : (
                  <span>Copia archivada no disponible</span>
                )}{" "}
                · sha256 {shortHash(link.sha256)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
