import Link from "next/link";
import { ColorLegend } from "@/components/ColorLegend";
import { DataTable } from "@/components/chart/DataTable";
import { InteractiveCoparticipacionChart } from "@/components/chart/InteractiveCoparticipacionChart";
import { DrawerTrigger } from "@/components/DrawerTrigger";
import { ShareButton } from "@/components/ShareButton";
import { SourcesFooter } from "@/components/SourcesFooter";
import { computeCoparticipacionTrend } from "@/lib/insight";
import { formatArsHuman, formatArsPlain, formatPeriodEsAr } from "@/lib/format";
import { computePerCapitaSeries } from "@/lib/perCapita";
import { buildPageMetadata } from "@/lib/seo";
import { buildShareImageOptions } from "@/lib/shareImage";
import { getShareFact, shareTextFor, shareUrlFor } from "@/lib/shareFacts";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "Coparticipación municipal",
  description:
    "Cuánto recibe Coronel Rosales de coparticipación cada mes, en plata de hoy, con fuente y archivo verificables.",
  path: "/coparticipacion",
});

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * Page hierarchy inverted per DESIGN.md's "coparticipación page surgery"
 * (slice 2 evolves this from static SVG + `<details>` to a real client
 * island, see DESIGN.md's slice 2 decision log):
 * (a) a plain-language, DATA-DRIVEN conclusion sentence leads (never a
 *     hardcoded claim -- see lib/insight.ts);
 * (b) one BIG, INTERACTIVE chart (`InteractiveCoparticipacionChart`,
 *     client island) -- Coronel Rosales only, real series by default,
 *     with a Real/Nominal segmented control replacing the old separate
 *     "ver también sin ajustar" static toggle-chart;
 * (c) every table and methodology note stays fully intact, just collapsed
 *     behind a single closed-by-default "Ver todos los números" Drawer
 *     (slice 1 primitive) -- nothing is removed, only deprioritized
 *     behind one tap.
 *
 * Neighbor-comparison integrity decision (D8, see DESIGN.md decisions
 * log): a per-capita ("$ por habitante") comparison is the honest fix for
 * comparing municipios of very different size (Bahía Blanca is several
 * times more populous than Coronel Rosales) -- this used to be blocked on
 * having no archived, sha256-verified INDEC Censo 2022 population source
 * (`getPortalData()`'s source-provenance invariant rejects any
 * `sourceRefs` id with no matching manifest record, and this site never
 * fabricates a figure without an archived source). Feature H3a resolved
 * that: `data/poblacion-censo-2022.json` (`etl/etl/poblacion.py`) is now
 * a sourced, cross-verified Censo 2022 population per municipio, so the
 * per-cápita comparison (`lib/perCapita.ts`) is computed and rendered
 * below, inside the "Ver todos los números" drawer, alongside the
 * original absolute-pesos comparison (kept, with its existing caveat, as
 * a secondary raw-totals reference).
 */
export default function CoparticipacionPage() {
  const { coparticipacion, manifest, poblacionCenso } = getPortalData();

  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const points = coronelRosales?.points ?? [];
  const trend = computeCoparticipacionTrend(points);

  const heroPoints = points.map((point) => ({
    period: point.period,
    real: point.realArs,
    nominal: point.nominalArs,
  }));

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
  const perCapitaSeries = computePerCapitaSeries(coparticipacion, poblacionCenso);

  const baseMonthLabel = formatPeriodEsAr(coparticipacion.baseMonth);
  const dataThroughLabel = formatPeriodEsAr(coparticipacion.dataThrough);
  const sourceLinks = resolveSourceRefs(
    [...coparticipacion.sourceRefs, ...poblacionCenso.sourceRefs],
    manifest,
  );

  // Feature H3b: one-tap SHARE for "coparticipación del último mes".
  const coparticipacionFact = getShareFact("coparticipacion");

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

      {/* (b) BIG chart -- Coronel Rosales, interactive, real series by
          default -- hover/touch tooltip, keyboard nav (arrows/Home/End),
          crosshair, labelled end point, dashed reference line, and a
          Real/Nominal segmented control (supersedes the old separate
          "ver también sin ajustar" static toggle-chart: switching series
          now happens IN the hero chart itself). */}
      {heroPoints.length > 0 ? (
        <section aria-labelledby="serie-hero-heading">
          <h2 id="serie-hero-heading" className="sr-only">
            Serie de Coronel Rosales
          </h2>
          <p className="max-w-[62ch] text-sm text-muted">
            &quot;Real&quot; = ya descontada la inflación, para comparar meses
            de años distintos.
          </p>
          <div className="mt-4">
            <InteractiveCoparticipacionChart
              points={heroPoints}
              baseMonthLabel={baseMonthLabel}
            />
          </div>

          {coparticipacionFact ? (
            <div className="mt-4">
              <ShareButton
                url={shareUrlFor(coparticipacionFact)}
                title={coparticipacionFact.headline}
                text={shareTextFor(coparticipacionFact)}
                images={buildShareImageOptions(coparticipacionFact.id)}
              />
            </div>
          ) : null}

          <ColorLegend className="mt-6" />
        </section>
      ) : null}

      {/* (c) Everything else -- both tables + methodology + the neighbor
          comparison -- collapsed behind ONE Drawer (slice 1 primitive),
          closed by default. Nothing here is removed, only deprioritized
          behind one tap ("Ver todos los números"). */}
      <div className="border-t border-rule pt-6">
        <DrawerTrigger
          triggerLabel="Ver todos los números"
          title="Coparticipación — todos los números"
          description={`en pesos constantes de ${baseMonthLabel} · datos hasta ${dataThroughLabel}`}
        >
        <div className="space-y-10">
          <section aria-labelledby="comparacion-per-capita-heading">
            <h2
              id="comparacion-per-capita-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              Comparación por habitante
            </h2>
            <p className="mt-1 max-w-[62ch] text-sm text-muted">
              Coparticipación mensual dividida por la población de cada
              municipio — la forma justa de comparar, porque Bahía Blanca
              tiene varias veces más habitantes que Coronel Rosales. Valores
              en pesos constantes de {baseMonthLabel}.
            </p>
            <p className="mt-3 max-w-[62ch] text-sm text-ink">
              Coparticipación por habitante (Censo 2022, INDEC).
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted sm:hidden">
              Desliza para ver los 4 municipios →
            </p>
            <div className="mt-3 overflow-x-auto">
              <DataTable
                caption={`Coparticipación mensual por habitante, en pesos constantes de ${baseMonthLabel} (Censo 2022, INDEC)`}
                series={perCapitaSeries}
                formatValue={formatArsPlain}
                formatFullPrecision={formatArsPlain}
                formatPeriod={formatPeriodEsAr}
                colorizeBySign
              />
            </div>
            <p className="mt-3 max-w-[62ch] text-xs text-muted">
              Población: Censo Nacional de Población, Hogares y Viviendas
              2022 (INDEC), vía la Dirección Provincial de Estadística
              (Provincia de Buenos Aires).
            </p>
          </section>

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
            {/* Neighbor-comparison integrity fix (H3a, see module
                docstring): this stays an absolute-pesos comparison with an
                explicit caveat -- the fair, per-inhabitant comparison now
                lives in the section right above. */}
            <p className="mt-3 max-w-[62ch] border-l-[5px] border-ocre bg-surface py-3 pl-4 text-sm text-ink">
              Cifras absolutas, no ajustadas por población — Bahía Blanca tiene
              varias veces más habitantes que Coronel Rosales. Ver la
              comparación por habitante arriba para una comparación justa.
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
        </DrawerTrigger>
      </div>

      <SourcesFooter links={sourceLinks} />
    </div>
  );
}
