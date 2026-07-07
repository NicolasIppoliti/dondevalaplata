import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/chart/DataTable";
import { SvgChart } from "@/components/chart/SvgChart";
import { SourcesFooter } from "@/components/SourcesFooter";
import { computeCoparticipacionTrend } from "@/lib/insight";
import { formatArsHuman, formatArsPlain, formatPeriodEsAr } from "@/lib/format";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Coparticipación municipal",
  description:
    "Cuánto recibe Coronel Rosales de coparticipación cada mes, en plata de hoy, con fuente y archivo verificables.",
};

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * Page hierarchy inverted per DESIGN.md's "coparticipación page surgery":
 * (a) a plain-language, DATA-DRIVEN conclusion sentence leads (never a
 *     hardcoded claim -- see lib/insight.ts);
 * (b) one BIG chart, Coronel Rosales' real (inflation-adjusted) series
 *     only, with the nominal series and the neighbor comparison behind
 *     zero-JS <details> toggles;
 * (c) every table and methodology note stays fully intact, just collapsed
 *     behind a single closed-by-default "Ver todos los números" <details>
 *     -- nothing is removed, only deprioritized behind one tap.
 *
 * Neighbor-comparison integrity decision (D8, see DESIGN.md decisions
 * log): a per-capita ("$ por habitante") comparison would be the honest
 * fix for today's absolute-pesos comparison (Bahía Blanca is several
 * times more populous than Coronel Rosales), but this build has no
 * archived, sha256-verified INDEC Censo 2022 population source --
 * `getPortalData()`'s source-provenance invariant would reject a
 * `sourceRefs` id with no matching manifest record, and inventing
 * population figures without an archived source would violate the same
 * "never fabricate" doctrine that governs every other figure on this
 * site. Falls back instead to: default view is Coronel Rosales only (the
 * hero chart), and the absolute-pesos comparison moves inside the
 * collapsed section with an explicit caveat instead of being presented as
 * apples-to-apples.
 */
export default function CoparticipacionPage() {
  const { coparticipacion, manifest } = getPortalData();

  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const points = coronelRosales?.points ?? [];
  const trend = computeCoparticipacionTrend(points);

  const heroRealSeries = coronelRosales
    ? [
        {
          id: `${coronelRosales.municipioId}-real`,
          label: "Coronel Rosales — real",
          points: points.map((point) => ({
            period: point.period,
            value: point.realArs,
          })),
        },
      ]
    : [];
  const heroCompareSeries = coronelRosales
    ? [
        {
          id: `${coronelRosales.municipioId}-real`,
          label: "Real (ajustado por inflación)",
          points: points.map((point) => ({
            period: point.period,
            value: point.realArs,
          })),
        },
        {
          id: `${coronelRosales.municipioId}-nominal`,
          label: "Nominal (sin ajustar)",
          points: points.map((point) => ({
            period: point.period,
            value: point.nominalArs,
          })),
        },
      ]
    : [];

  const adjustedSeries = coparticipacion.series.map((series) => ({
    id: series.municipioId,
    label: series.municipio,
    points: series.points.map((point) => ({
      period: point.period,
      value: point.realArs,
    })),
  }));
  const nominalSeries = coparticipacion.series.map((series) => ({
    id: series.municipioId,
    label: series.municipio,
    points: series.points.map((point) => ({
      period: point.period,
      value: point.nominalArs,
    })),
  }));

  const baseMonthLabel = formatPeriodEsAr(coparticipacion.baseMonth);
  const dataThroughLabel = formatPeriodEsAr(coparticipacion.dataThrough);
  const sourceLinks = resolveSourceRefs(coparticipacion.sourceRefs, manifest);

  // >=1 intermediate gridline per calendar year present, so the Y axis
  // reads as a real timeline instead of just a min/mid/max sketch.
  const yearsPresent = new Set(points.map((point) => point.period.slice(0, 4)))
    .size;
  const heroGridLineCount = Math.max(3, yearsPresent + 2);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Cuánto llegó este mes?
        </h1>

        {/* (a) Plain-language conclusion, FIRST -- derived from the real
            data (lib/insight.ts), never hardcoded. */}
        <p className="mt-3 max-w-[38ch] font-display text-[clamp(20px,3.4vw,28px)] font-semibold text-ink">
          {trend.message}
        </p>
        <p className="mt-3 max-w-[62ch] text-ink">
          La coparticipación es la plata que la Provincia le gira al municipio
          todos los meses.
        </p>
        <p className="mt-3 inline-block border border-dashed border-muted bg-paper px-3 py-1 font-mono text-xs text-muted">
          Datos hasta {dataThroughLabel}. {coparticipacion.lagNote}
        </p>
      </section>

      {/* (b) BIG chart -- Coronel Rosales real series only, by default. */}
      {heroRealSeries.length > 0 ? (
        <section aria-labelledby="serie-hero-heading">
          <h2 id="serie-hero-heading" className="sr-only">
            Serie real de Coronel Rosales
          </h2>
          <p className="max-w-[62ch] text-sm text-muted">
            &quot;Real&quot; = ya descontada la inflación, para comparar meses
            de años distintos.
          </p>
          <div className="mt-4 w-full">
            {/* Mobile: portrait viewBox, tuned to read as a genuinely tall
                "hero" figure on a phone screen (DESIGN.md). */}
            <div className="h-[50vh] max-h-[480px] min-h-[280px] w-full sm:hidden">
              <SvgChart
                series={heroRealSeries}
                ariaLabel={`Serie mensual de Coronel Rosales, en pesos constantes de ${baseMonthLabel}; el detalle exacto está en la tabla dentro de "Ver todos los números"`}
                formatValue={formatArsHuman}
                formatPeriod={formatPeriodEsAr}
                showLastPointLabel
                showLegend={false}
                gridLineCount={heroGridLineCount}
                heightClassName="w-full"
                fillHeight
                viewBoxWidth={380}
                viewBoxHeight={460}
                axisUnitLabel={`Montos en pesos, ajustados por inflación (base ${baseMonthLabel})`}
              />
            </div>
            {/* Desktop/tablet (>=sm): reusing the mobile portrait viewBox
                here would letterbox -- a wide bounded container fitting a
                380x460 box via `preserveAspectRatio="xMidYMid meet"`
                renders small and centered, with large empty side margins.
                A landscape viewBox spreads the SAME series across more
                horizontal space instead, filling the container width at
                the same fixed height, with identical gridlines/olive
                line/mono labels -- not a stretched/distorted mobile chart. */}
            <div className="hidden h-[420px] w-full sm:block">
              <SvgChart
                series={heroRealSeries}
                ariaLabel={`Serie mensual de Coronel Rosales, en pesos constantes de ${baseMonthLabel}; el detalle exacto está en la tabla dentro de "Ver todos los números"`}
                formatValue={formatArsHuman}
                formatPeriod={formatPeriodEsAr}
                showLastPointLabel
                showLegend={false}
                gridLineCount={heroGridLineCount}
                heightClassName="w-full"
                fillHeight
                viewBoxWidth={880}
                viewBoxHeight={460}
                axisUnitLabel={`Montos en pesos, ajustados por inflación (base ${baseMonthLabel})`}
              />
            </div>
          </div>

          <details className="mt-4 border border-rule p-3">
            <summary className="cursor-pointer font-mono text-xs tracking-[0.08em] text-muted uppercase">
              ver también sin ajustar
            </summary>
            <div className="mt-4">
              <SvgChart
                series={heroCompareSeries}
                ariaLabel={`Serie mensual de Coronel Rosales, real vs. nominal (sin ajustar por inflación)`}
                formatValue={formatArsHuman}
                formatPeriod={formatPeriodEsAr}
                showLastPointLabel
              />
            </div>
          </details>
        </section>
      ) : null}

      {/* (c) Everything else -- both tables + methodology + the neighbor
          comparison -- collapsed behind ONE native, zero-JS <details>,
          closed by default. Nothing here is removed, only deprioritized. */}
      <details className="border-t border-rule pt-6">
        <summary className="cursor-pointer font-display text-lg font-semibold text-ink">
          Ver todos los números
        </summary>

        <div className="mt-6 space-y-10">
          <section aria-labelledby="comparacion-heading">
            <h2
              id="comparacion-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              Comparación con municipios vecinos
            </h2>
            <p className="mt-1 max-w-[62ch] text-sm text-muted">
              Valores expresados en pesos constantes de {baseMonthLabel} (IPC
              INDEC nivel general nacional, serie {coparticipacion.ipcSeriesId}
              ).
            </p>
            {/* Neighbor-comparison integrity fix (fallback path): no
                verifiable, archived population source exists in this build
                (see module docstring), so this stays an absolute-pesos
                comparison with an explicit caveat instead of a fabricated
                per-capita figure. */}
            <p className="mt-3 max-w-[62ch] border-l-[5px] border-ocre bg-surface py-3 pl-4 text-sm text-ink">
              Cifras absolutas, no ajustadas por población — Bahía Blanca tiene
              varias veces más habitantes que Coronel Rosales.
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted sm:hidden">
              Desliza para ver los 4 municipios →
            </p>
            <div className="mt-3 overflow-x-auto">
              <DataTable
                caption={`Coparticipación mensual ajustada por inflación, en pesos constantes de ${baseMonthLabel}`}
                series={adjustedSeries}
                formatValue={formatArsHuman}
                formatFullPrecision={formatArsPlain}
                formatPeriod={formatPeriodEsAr}
                colorizeBySign
              />
            </div>
          </section>

          <section aria-labelledby="serie-nominal-heading">
            <h2
              id="serie-nominal-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              Valores nominales (sin ajustar)
            </h2>
            <p className="mt-1 max-w-[62ch] text-sm text-muted">
              Estos valores nominales NO están ajustados por inflación; se
              muestran como referencia del monto efectivamente transferido cada
              mes, distinto de la serie ajustada de arriba.
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted sm:hidden">
              Desliza para ver los 4 municipios →
            </p>
            <div className="mt-3 overflow-x-auto">
              <DataTable
                caption="Coparticipación mensual, valores nominales sin ajustar"
                series={nominalSeries}
                formatValue={formatArsHuman}
                formatFullPrecision={formatArsPlain}
                formatPeriod={formatPeriodEsAr}
                colorizeBySign
              />
            </div>
          </section>

          <section aria-labelledby="metodologia-heading">
            <h2
              id="metodologia-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              Metodología
            </h2>
            <p className="mt-2 max-w-[62ch] text-sm text-ink">
              El monto mensual mostrado es la suma de todos los conceptos que
              integran la transferencia de coparticipación (Coparticipación
              Bruta, Fondo Educativo, Descentralización Tributaria y otros), no
              solo el concepto &quot;Coparticipación Bruta&quot; — más detalle
              en <Link href="/fuentes">Fuentes y metodología</Link>.
            </p>
            <p className="mt-3 max-w-[62ch] text-sm text-ink">
              Comparado en <span className="font-semibold">plata de hoy</span>.{" "}
              <span className="text-xs text-muted">
                En pesos constantes de {baseMonthLabel} (IPC INDEC nivel general
                nacional, serie {coparticipacion.ipcSeriesId}).
              </span>
            </p>
          </section>
        </div>
      </details>

      <SourcesFooter links={sourceLinks} />
    </div>
  );
}
