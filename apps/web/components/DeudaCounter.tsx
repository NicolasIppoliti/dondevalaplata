import { formatDateEsAr } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { CadenciaDeuda } from "@/lib/schemas";

/**
 * DeudaCounter (feature G1): a prominent, factual widget stating the
 * municipality has not updated its published stock-de-deuda since a given
 * date, with the days/quarters elapsed, the last published figure, and
 * (full variant only) the legal hook: Ordenanza 3638 (Acceso a la
 * Información Pública de Coronel Rosales), Art. 11, already obliges
 * publishing this. Dual-link provenance + short sha256, same pattern as
 * every other headline figure on the portal (DESIGN.md INVIOLABLE rule
 * #2).
 *
 * Every number here comes from `data/cadencia.json`, itself computed at
 * ETL build time -- `elapsedDays`/`quartersMissing` are NOT derived from
 * `Date.now()` at render, so this component renders identically whether
 * server-rendered at build time or hydrated later, and never breaks
 * static prerendering.
 *
 * Neutrality note: this states a documented fact about a PUBLICATION
 * CADENCE (the municipality itself stopped publishing this series), never
 * an evaluation of a person or gestión -- framed with the same `--ocre`
 * "aviso documental" token DESIGN.md's Alerts pattern reserves for this
 * exact case, never `--stamp`/alarm-red.
 */
interface DeudaCounterProps {
  deuda: CadenciaDeuda;
  sourceLinks: SourceLink[];
  compact?: boolean;
}

export function DeudaCounter({ deuda, sourceLinks, compact = false }: DeudaCounterProps) {
  return (
    <section
      aria-labelledby="deuda-counter-heading"
      className="rounded-lg border border-ocre border-l-[5px] bg-ocre-soft p-5 shadow-card"
    >
      <h2
        id="deuda-counter-heading"
        className={
          compact
            ? "font-display text-base font-semibold text-ink"
            : "font-display text-xl font-semibold text-ink"
        }
      >
        El municipio no actualiza su stock de deuda pública desde el{" "}
        {formatDateEsAr(deuda.lastPeriodEnd)}
      </h2>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-mono text-ink tabular-nums">
        <span className={compact ? "text-3xl font-semibold" : "text-4xl font-semibold"}>
          {deuda.elapsedDays}
        </span>
        <span className="text-sm text-ink-2">
          días sin actualizar · {deuda.quartersMissing} trimestres sin publicar
        </span>
      </p>

      <p className="mt-2 text-sm text-ink-2">
        Último dato publicado: <strong className="text-ink">{deuda.lastPeriod}</strong>{" "}
        (cierre {formatDateEsAr(deuda.lastPeriodEnd)}), por un total de{" "}
        <strong className="font-mono text-ink tabular-nums">
          {deuda.lastFigureLabel}
        </strong>
        .
      </p>

      {!compact ? (
        <>
          <p className="mt-3 max-w-[64ch] text-sm text-ink-2">
            {deuda.ordenanzaRef}, {deuda.ordenanzaArticle}, ya obliga a
            publicar esta información en la web oficial. {deuda.ordenanzaNote}
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
