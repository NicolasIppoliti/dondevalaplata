import Link from "next/link";
import {
  sortByDevengadoDesc,
  type AreaPersonal,
  type PersonalTotals,
} from "@/lib/personal";
import { formatArsHuman, formatArsPlain } from "@/lib/format";

/**
 * "¿Cuánto se va en sueldos?" -- the ONLY consumer of `lib/personal.ts`. A
 * plain server component (no "use client"), same "cero JS" doctrine already
 * used by `PresupuestoEjecucionSection`: a static, build-time-derived total
 * + per-área breakdown over the SAME reconciled `data/gasto-partida.json`
 * feature G2 already validated.
 *
 * "% del gasto" renders in plain neutral ink -- NEVER `--olive`/`--stamp`,
 * NEVER a ▲/▼ marker -- because it is a ratio within ONE reporting period
 * (personal devengado / total devengado, same period), not an arithmetic
 * variation of the same series over time (DESIGN.md's chromatic-neutrality
 * rule; same precedent as `GastoPartidaExplorer`'s "% ejecutado" and
 * `PresupuestoEjecucionSection`'s own AreaRow). The per-área breakdown bars
 * use `--ocre` ("resalta, no juzga" documentary token) -- never a
 * good/bad-management judgment about any área.
 *
 * THE POINT of this section is the honest caveat, not the total: this is
 * the AGGREGATE object-level figure ("cuánto gasta el municipio en personal
 * en total"). The ITEMIZED detail -- quién cobra cuánto, los sueldos de
 * cada funcionario -- is NOT public. Ordenanza 3638 (Coronel Rosales,
 * Acceso a la Información Pública) Art. 11 already obliges the official
 * website to publish "gastos de contratación de personal", and the
 * municipality does not do it (same non-compliance already documented for
 * the proveedores padrón, see `AdjudicacionesExplorer`'s own caveat) --
 * stated plainly, factually, never naming anyone.
 */
export function PersonalSection({
  totals,
  areas,
  shareOfTotal,
  periodLabel,
}: {
  totals: PersonalTotals;
  areas: AreaPersonal[];
  shareOfTotal: number | null;
  periodLabel: string;
}) {
  const sorted = sortByDevengadoDesc(areas);
  const maxDevengadoArs = Math.max(...sorted.map((area) => area.devengadoArs), 0);
  const sharePct =
    shareOfTotal !== null ? Math.round(shareOfTotal * 100) : null;

  return (
    <section aria-labelledby="sueldos-heading" className="space-y-5">
      <div>
        <h2
          id="sueldos-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          ¿Cuánto se va en sueldos?
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-sm text-muted">
          Todo lo que el municipio devengó en el objeto del gasto
          &quot;Gastos en Personal&quot; (código 1), sumado en las{" "}
          {sorted.length} áreas del municipio.
        </p>
      </div>

      <div className="rounded-lg border border-rule bg-surface p-4 shadow-card sm:p-5">
        <p className="font-mono text-xs tracking-[0.08em] text-muted uppercase">
          Gastos en Personal · devengado
        </p>
        <p
          title={formatArsPlain(totals.devengadoArs)}
          className="mt-1 font-mono text-[clamp(28px,6vw,40px)] font-medium tabular-nums text-ink"
        >
          {formatArsHuman(totals.devengadoArs)}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          Representa el{" "}
          {/* Neutral ink -- NEVER --olive/--stamp, see component docstring. */}
          <strong className="font-mono text-ink">
            {sharePct !== null ? `${sharePct}%` : "s/d"}
          </strong>{" "}
          de todo lo que el municipio gastó (devengado) en el{" "}
          {periodLabel}.
        </p>
      </div>

      <div className="rounded-lg border border-rule bg-surface p-4">
        <p className="max-w-[68ch] text-sm text-ink-2">
          Estos números son del <strong className="text-ink">{periodLabel}</strong> —
          alrededor de una cuarta parte del año. El porcentaje de arriba
          compara sueldos contra TODO lo gastado en ese mismo lapso, no
          contra el presupuesto anual completo: es una foto de un momento
          puntual de ejecución, no un promedio anual.
        </p>
      </div>

      <div className="rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
        <h3 className="font-sans text-sm font-bold text-ink">
          Qué es esto — y qué NO es
        </h3>
        <p className="mt-1.5 max-w-[64ch] text-sm text-ink-2">
          Este es el total AGREGADO del objeto del gasto: cuánto gasta el
          municipio en personal en total. El detalle itemizado — quién cobra
          cuánto, los sueldos de cada funcionario — no es público. La
          Ordenanza 3638 (Art. 11) obliga a publicar los gastos de
          contratación de personal, y el municipio no lo hace.{" "}
          <Link href="/pedidos">Pedí el detalle</Link>.
        </p>
      </div>

      <ul className="space-y-3">
        {sorted.map((area) => (
          <AreaRow key={area.code} area={area} maxDevengadoArs={maxDevengadoArs} />
        ))}
      </ul>
    </section>
  );
}

function AreaRow({
  area,
  maxDevengadoArs,
}: {
  area: AreaPersonal;
  maxDevengadoArs: number;
}) {
  const barWidthPct =
    maxDevengadoArs > 0 ? (area.devengadoArs / maxDevengadoArs) * 100 : 0;

  return (
    <li className="rounded-lg border border-rule bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-sans font-semibold text-ink">{area.name}</span>
        <span
          title={formatArsPlain(area.devengadoArs)}
          className="font-mono text-sm tabular-nums text-ink"
        >
          {formatArsHuman(area.devengadoArs)}
        </span>
      </div>

      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-rule"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-ocre"
          style={{ width: `${barWidthPct}%` }}
        />
      </div>
    </li>
  );
}
