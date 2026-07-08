import type { Metadata } from "next";
import { CadenceDashboard } from "@/components/CadenceDashboard";
import { DeudaCounter } from "@/components/DeudaCounter";
import { SourcesFooter } from "@/components/SourcesFooter";
import { TransparenciaGauge } from "@/components/TransparenciaGauge";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Transparencia",
  description:
    "Índice de Transparencia Fiscal Municipal (ASAP) de Coronel Rosales: puntaje, qué mide, qué falta y fuente verificable.",
};

/**
 * /transparencia -- "¿Qué tan transparente es el municipio?" (DESIGN.md
 * component pattern "Barra de progreso de cumplimiento", see decisions
 * log). Every figure comes from `data/transparencia.json`, itself built
 * from a curated ASAP source read by a human reviewer off the primary PDF
 * (see `etl/asap_transparencia.yaml`) -- no client JS renders any number
 * on this page.
 *
 * Neutrality note (DESIGN.md "Regla de neutralidad cromática"): the
 * trend badge (70 -> 81) is colored `--olive` because it is a genuine
 * arithmetic increase of the SAME index over time -- the same precedent
 * already established for the coparticipación real-variation badge on
 * `/` and `/coparticipacion`. The "Qué falta" dimensions, by contrast,
 * are framed with the `--ocre` "resalta, no juzga" documentary token
 * (same token as the fallos "documento escaneado" badge), never a
 * red/alarm color -- these are pending fiscal-disclosure items measured
 * by ASAP's own published methodology, not a judgment of any official or
 * administration.
 *
 * Slice 3 (modern skin): the score gauge/ring is server-rendered SVG whose
 * geometry comes from the pure, tested `computeGaugeGeometry` helper (see
 * `lib/gauge.ts`) -- its "fill" motion is a pure-CSS `@keyframes` animation
 * (`.gauge-arc` in `app/globals.css`), not a client chart library. The
 * ring's arc uses `--ink-2` (neutral graphite), NOT `--olive`/`--stamp`:
 * the ABSOLUTE score itself is not an arithmetic variation of anything, so
 * coloring it green/red would violate the neutrality rule -- only the
 * genuine 70->81 trend badge below earns `--olive`. `<CountUp>` animates
 * the "81" digits (a rating, same precedent as the design doctrine's
 * "puntaje 81/100" use case) -- unlike the home hero peso figure (see
 * `app/page.tsx`'s slice 3 comment), a rating has no "wrong intermediate"
 * problem: any number between 0 and 81 while counting up is still a
 * truthful partial reading of the same rating, never a misrepresented
 * currency amount.
 *
 * Fidelity slice F2: the ring + fraction + `<CountUp>` markup that used to
 * live inline here now lives in `components/TransparenciaGauge.tsx`, so the
 * home dashboard preview can reuse the EXACT same ring at a smaller `size`
 * instead of a second hand-rolled SVG. Behavior/markup here is unchanged.
 */
export default function TransparenciaPage() {
  const { transparencia, cadencia, manifest } = getPortalData();
  const { dimensions, trend } = transparencia;

  const fullMarkDimensions = dimensions.filter((d) => d.got >= d.max);
  const gapDimensions = dimensions.filter((d) => d.got < d.max);

  const firstTrendPoint = trend[0];
  const lastTrendPoint = trend[trend.length - 1];
  const delta =
    firstTrendPoint && lastTrendPoint
      ? lastTrendPoint.total - firstTrendPoint.total
      : null;

  const deudaSourceLinks = resolveSourceRefs(cadencia.deuda.sourceRefs, manifest);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Qué tan transparente es el municipio?
        </h1>

        <p className="mt-3 font-mono text-sm font-semibold tracking-[0.1em] text-stamp uppercase sm:text-base">
          Fuente: {transparencia.source} — una {transparencia.sourceType} ·
          transparencia FISCAL, no integral · {transparencia.reportLabel}
        </p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          <TransparenciaGauge
            value={transparencia.total}
            max={transparencia.max}
          />

          <p className="font-display text-xl font-semibold text-ink">
            {transparencia.category}
          </p>
        </div>

        <div className="mt-6 max-w-[74ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
          <h2 className="font-sans text-sm font-bold text-ink">
            Quién publica este puntaje — y qué mide
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
            {transparencia.indexName}, publicado por{" "}
            <strong className="text-ink">{transparencia.sourceFullName}</strong>{" "}
            ({transparencia.sourceType}). Mide transparencia fiscal publicada
            en la web oficial del municipio — no transparencia integral.
            Datos al {transparencia.dataThrough} ({transparencia.reportLabel}
            ).
          </p>
        </div>
      </section>

      <DeudaCounter deuda={cadencia.deuda} sourceLinks={deudaSourceLinks} />

      {firstTrendPoint && lastTrendPoint && delta !== null ? (
        <section aria-labelledby="tendencia-heading">
          <h2
            id="tendencia-heading"
            className="font-display text-xl font-semibold text-ink"
          >
            Tendencia
          </h2>
          <p className="mt-2 max-w-[62ch] text-ink">
            Subió de {firstTrendPoint.total} (
            {firstTrendPoint.reportLabel.toLowerCase()}) a{" "}
            {lastTrendPoint.total} ({lastTrendPoint.reportLabel.toLowerCase()}
            ).
          </p>
          <p
            className={`mt-3 inline-block border-2 px-3 py-1 font-mono text-[clamp(15px,2.4vw,20px)] tabular-nums ${
              delta >= 0 ? "border-olive text-olive" : "border-stamp text-stamp"
            }`}
          >
            <span className="sr-only">Variación del puntaje: </span>
            <span aria-hidden="true">{delta >= 0 ? "▲" : "▼"}</span>{" "}
            {delta >= 0 ? "+" : ""}
            {delta} puntos
          </p>

          {/* Tiny zero-JS bar visualization -- plain divs sized by width
              percentage, no chart library, no client script. */}
          <ul className="mt-4 max-w-[420px] space-y-2.5" aria-hidden="true">
            {trend.map((point) => (
              <li key={point.reportLabel} className="flex items-center gap-3">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">
                  {point.reportLabel}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-rule">
                  <span
                    className="block h-full rounded-full bg-olive"
                    style={{ width: `${(point.total / transparencia.max) * 100}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-xs text-ink tabular-nums">
                  {point.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="hace-bien-heading">
        <h2
          id="hace-bien-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Qué hace bien
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Dimensiones con puntaje completo en el informe.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fullMarkDimensions.map((d) => (
            <li
              key={d.name}
              className="rounded-lg border border-rule bg-surface p-4 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-2">{d.name}</span>
                <strong className="font-mono text-sm text-ink tabular-nums">
                  {`${d.got} / ${d.max}`}
                </strong>
              </div>
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-rule"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-ink-2"
                  style={{ width: `${(d.got / d.max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="que-falta-heading">
        <h2
          id="que-falta-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Qué falta para llegar a 100
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Dimensiones fiscales pendientes según el mismo informe — ítems
          objetivos de la metodología de ASAP, no una evaluación de personas
          ni de gestiones.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {gapDimensions.map((d) => (
            <li
              key={d.name}
              className="rounded-lg border border-ocre border-l-[5px] bg-surface p-4 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-2">{d.name}</span>
                <strong className="font-mono text-sm text-ink tabular-nums">
                  {`${d.got} / ${d.max}`}
                </strong>
              </div>
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-rule"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-ocre"
                  style={{ width: `${(d.got / d.max) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                (faltan {d.max - d.got} puntos)
              </p>
            </li>
          ))}
        </ul>
      </section>

      <CadenceDashboard cadencia={cadencia} />

      <section
        aria-labelledby="alcance-heading"
        className="max-w-[74ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4"
      >
        <h2 id="alcance-heading" className="sr-only">
          Alcance del índice
        </h2>
        <p className="max-w-[62ch] text-sm text-ink">
          Un 100 acá significaría transparencia fiscal completa publicada en
          la web oficial — no transparencia integral: el índice no evalúa
          compras, salarios, declaraciones juradas, actas ni datos abiertos.
        </p>
      </section>

      <p className="font-mono text-xs text-muted">
        <a href={transparencia.indexUrl} target="_blank" rel="noopener noreferrer">
          Ver índice completo de municipios (asap.org.ar)
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </p>

      <SourcesFooter
        links={resolveSourceRefs(
          [...new Set([...transparencia.sourceRefs, ...cadencia.sourceRefs])],
          manifest,
        )}
        note={`Datos al ${transparencia.dataThrough} (${transparencia.reportLabel}). Este índice mide únicamente transparencia fiscal publicada en la web oficial del municipio, no transparencia integral, y se publica con rezago respecto del trimestre evaluado. La cadencia de publicación (última sección) se recalcula en cada build a partir de la lista en vivo de documentos oficiales.`}
      />
    </div>
  );
}
