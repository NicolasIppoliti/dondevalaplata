import type { CadenciaData } from "@/lib/schemas";

/**
 * CadenceDashboard (feature G1, DESIGN.md-compliant): live status of the 6
 * ASAP dimensions -- last period actually published (mcr.gob.ar/wp-json),
 * how stale that publication is, points got/max, and (for the 3 weak
 * dimensions) the factual, sourced reason + what reaching 10 requires.
 *
 * Neutrality note: the prompt that requested this feature called it a
 * "semáforo" (traffic light), but a literal red/yellow/green treatment
 * would violate DESIGN.md's INVIOLABLE neutrality rule -- red/green may
 * ONLY mark a genuine arithmetic variation of the SAME series over time,
 * never a static "good/bad" judgment of a gestión. Full-mark dimensions
 * render on a plain surface (same as the existing "Qué hace bien" cards);
 * gap dimensions get the established `--ocre` "resalta, no juzga"
 * documentary left-border (same token as the fallos "documento escaneado"
 * badge and the existing "Qué falta" cards) -- never `--stamp`/alarm-red.
 * This is deliberate: it is a dashboard about publication CADENCE, not a
 * scoreboard of a gestión's performance.
 */
interface CadenceDashboardProps {
  cadencia: CadenciaData;
}

export function CadenceDashboard({ cadencia }: CadenceDashboardProps) {
  const gapDimensions = cadencia.dimensions.filter((d) => d.got < d.max);
  const totalToReach100 = gapDimensions.reduce((acc, d) => acc + (d.max - d.got), 0);

  return (
    <section aria-labelledby="cadencia-heading" className="space-y-5">
      <div>
        <h2
          id="cadencia-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          ¿Con qué frecuencia se actualiza esta información?
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-sm text-muted">
          Para cada dimensión del informe de {cadencia.asapReport}, el último
          documento efectivamente publicado en la web oficial (mcr.gob.ar) y
          hace cuánto se publicó. Se recalcula en cada build/despliegue del
          portal a partir de la lista en vivo de documentos oficiales — no es
          una foto fija.
        </p>
      </div>

      <div className="rounded-lg border border-ocre border-l-[5px] bg-ocre-soft p-4">
        <p className="max-w-[64ch] text-sm text-ink">{cadencia.killerFact}</p>
      </div>

      {gapDimensions.length > 0 ? (
        <div className="rounded-lg border border-rule bg-surface p-4 shadow-card">
          <p className="font-mono text-xs tracking-[0.08em] text-muted uppercase">
            Camino de 81 a 100
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {gapDimensions.map((d) => (
              <li key={d.name}>
                <span className="font-mono font-semibold text-ink tabular-nums">
                  +{d.max - d.got}
                </span>{" "}
                {d.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-sm text-ink tabular-nums">
            81 + {totalToReach100} = 100
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {cadencia.dimensions.map((d) => {
          const isGap = d.got < d.max;
          return (
            <li
              key={d.name}
              className={
                isGap
                  ? "rounded-lg border border-ocre border-l-[5px] bg-surface p-4 shadow-card"
                  : "rounded-lg border border-rule bg-surface p-4 shadow-card"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-ink">{d.name}</span>
                <strong className="font-mono text-sm text-ink tabular-nums">
                  {`${d.got} / ${d.max}`}
                </strong>
              </div>

              <p className="mt-1.5 font-mono text-xs text-muted">
                {d.lastPeriodPublished ? (
                  <>
                    Último publicado: {d.lastPeriodPublished}
                    {d.lagMonths !== null ? (
                      <>
                        {" "}
                        · hace{" "}
                        {d.lagMonths === 0 ? "menos de 1 mes" : `${d.lagMonths} meses`}
                      </>
                    ) : null}
                  </>
                ) : (
                  "No depende de una serie documental trimestral"
                )}
              </p>

              {isGap ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-sm text-ink-2">{d.reason}</p>
                  <p className="text-sm text-ink-2">
                    <strong className="text-ink">Para llegar a 10:</strong>{" "}
                    {d.toReach10}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
