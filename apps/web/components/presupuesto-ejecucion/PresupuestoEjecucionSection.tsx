import {
  leastExecutedAreas,
  overExecutedAreas,
  sortByExecutionDesc,
  type AreaEjecucion,
} from "@/lib/presupuestoEjecucion";
import { formatArsHuman, formatArsPlain } from "@/lib/format";

/**
 * Feature H1: "¿Cumplen lo que prometieron?" -- Presupuesto vs. Ejecución
 * por área. A plain server component (no "use client"): a static,
 * build-time-derived list over the SAME reconciled data G2 already
 * validated, same "cero JS" doctrine already used by `CadenceDashboard`
 * and `/transparencia`'s progress bars.
 *
 * "% ejecutado" renders in plain neutral ink -- NEVER `--olive`/`--stamp`,
 * NEVER a ▲/▼ marker -- because it is a ratio within ONE reporting period,
 * not an arithmetic variation of the same series over time (DESIGN.md's
 * chromatic-neutrality rule; same precedent as `GastoPartidaExplorer`'s own
 * "% ejecutado" and `TransparenciaGauge`'s absolute score ring). An área
 * that executed beyond its current (already-adjusted) Vigente budget gets
 * the established `--ocre` "resalta, no juzga" documentary token instead --
 * never hidden, never `--stamp`/alarm-red, never a judgment.
 */
export function PresupuestoEjecucionSection({
  areas,
}: {
  areas: AreaEjecucion[];
}) {
  const sorted = sortByExecutionDesc(areas);
  const overExecuted = overExecutedAreas(areas);
  const leastExecuted = leastExecutedAreas(areas, 1);

  return (
    <section aria-labelledby="cumplen-heading" className="space-y-5">
      <div>
        <h2
          id="cumplen-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          ¿Cumplen lo que prometieron?
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-sm text-muted">
          Presupuestado (Vigente) contra ejecutado (Devengado), área por
          área. Mismo período y misma fuente que el detalle de abajo.
        </p>
      </div>

      <div className="rounded-lg border border-ocre border-l-[5px] bg-ocre-soft p-4">
        <p className="max-w-[68ch] text-sm text-ink">
          <strong>Vigente</strong> ya incluye las modificaciones aprobadas
          durante el año; ejecutar más del 100% significa que se gastó por
          encima incluso del presupuesto ya ajustado. Esto{" "}
          <strong>no prueba por sí solo una irregularidad</strong> — puede
          haber reasignaciones legítimas — pero es un dato que el vecino
          tiene derecho a ver y preguntar.
        </p>
      </div>

      {overExecuted.length > 0 ? (
        <div className="rounded-lg border border-ocre border-l-[5px] bg-surface p-4 shadow-card">
          <p className="font-mono text-xs tracking-[0.08em] text-muted uppercase">
            Caso que llama la atención
          </p>
          {overExecuted.map((area) => (
            <p key={area.code} className="mt-1.5 text-sm text-ink">
              <strong>{area.name}</strong> ejecutó{" "}
              <strong className="font-mono tabular-nums">
                {Math.round((area.executionFraction ?? 0) * 100)}%
              </strong>{" "}
              de su presupuesto vigente: {formatArsHuman(area.devengadoArs)}{" "}
              devengados sobre {formatArsHuman(area.vigenteArs)} vigentes,{" "}
              {formatArsHuman(area.gapArs)} por encima de lo aprobado.
            </p>
          ))}
        </div>
      ) : null}

      {leastExecuted.length > 0 ? (
        <p className="max-w-[68ch] text-sm text-ink-2">
          En el otro extremo, el área con menor ejecución relativa hasta
          ahora es <strong className="text-ink">{leastExecuted[0].name}</strong>
          , con{" "}
          {Math.round((leastExecuted[0].executionFraction ?? 0) * 100)}% de
          su presupuesto vigente ejecutado.
        </p>
      ) : null}

      <ul className="space-y-3">
        {sorted.map((area) => (
          <AreaRow key={area.code} area={area} />
        ))}
      </ul>
    </section>
  );
}

function AreaRow({ area }: { area: AreaEjecucion }) {
  const pct =
    area.executionFraction !== null
      ? Math.round(area.executionFraction * 100)
      : null;
  const isOver = area.executionFraction !== null && area.executionFraction > 1;
  const barWidthPct =
    area.executionFraction !== null
      ? Math.min(area.executionFraction, 1) * 100
      : 0;

  return (
    <li
      className={
        isOver
          ? "rounded-lg border border-ocre border-l-[5px] bg-surface p-4 shadow-card"
          : "rounded-lg border border-rule bg-surface p-4 shadow-card"
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-sans font-semibold text-ink">{area.name}</span>
        <span className="font-mono text-xs text-muted">{area.code}</span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 font-mono text-[13px] tabular-nums">
        <div>
          <dt className="text-[11px] text-muted uppercase">Presupuestado</dt>
          <dd title={formatArsPlain(area.vigenteArs)} className="text-ink">
            {formatArsHuman(area.vigenteArs)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted uppercase">Ejecutado</dt>
          <dd title={formatArsPlain(area.devengadoArs)} className="text-ink">
            {formatArsHuman(area.devengadoArs)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted uppercase">% ejecutado</dt>
          {/* Neutral ink -- NEVER --olive/--stamp, see component docstring. */}
          <dd className="text-ink">{pct !== null ? `${pct}%` : "s/d"}</dd>
        </div>
      </dl>

      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-rule"
        aria-hidden="true"
      >
        <div
          className={isOver ? "h-full rounded-full bg-ocre" : "h-full rounded-full bg-ink-2"}
          style={{ width: `${barWidthPct}%` }}
        />
      </div>

      {isOver ? (
        <p className="mt-2 text-xs text-ink-2">
          Superó lo vigente por {formatArsHuman(area.gapArs)}.
        </p>
      ) : null}
    </li>
  );
}
