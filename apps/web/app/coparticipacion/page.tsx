import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/chart/DataTable";
import { SvgChart } from "@/components/chart/SvgChart";
import { SourcesFooter } from "@/components/SourcesFooter";
import { formatArsCompact, formatArsPlain, formatPeriodEsAr } from "@/lib/format";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Coparticipación municipal",
  description:
    "Serie mensual de coparticipación de Coronel Rosales, ajustada por inflación y comparada con municipios vecinos, con fuente y archivo verificables.",
};

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

export default function CoparticipacionPage() {
  const { coparticipacion, manifest } = getPortalData();

  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const headlineSeries = coronelRosales
    ? [
        {
          id: `${coronelRosales.municipioId}-real`,
          label: "Constante (real)",
          points: coronelRosales.points.map((point) => ({
            period: point.period,
            value: point.realArs,
          })),
        },
        {
          id: `${coronelRosales.municipioId}-nominal`,
          label: "Nominal",
          points: coronelRosales.points.map((point) => ({
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

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Cuánto llegó este mes?
        </h1>
        <p
          className="mt-3 inline-block border border-dashed border-muted bg-paper px-3 py-1 font-mono text-xs text-muted"
        >
          Datos hasta {dataThroughLabel}. {coparticipacion.lagNote}
        </p>
        <p className="mt-4 max-w-[62ch] text-ink">
          Serie mensual de fondos de coparticipación recibidos por Coronel
          Rosales, comparada con los municipios vecinos de Bahía Blanca, Monte
          Hermoso y Villarino.
        </p>
        <p className="mt-2 max-w-[62ch] text-sm text-muted">
          El monto mensual mostrado es la suma de todos los conceptos que
          integran la transferencia de coparticipación (Coparticipación
          Bruta, Fondo Educativo, Descentralización Tributaria y otros),
          no solo el concepto &quot;Coparticipación Bruta&quot; —
          más detalle en{" "}
          <Link href="/fuentes">Fuentes y metodología</Link>.
        </p>
      </section>

      {headlineSeries.length > 0 ? (
        <section aria-labelledby="serie-coronel-rosales-heading">
          <h2
            id="serie-coronel-rosales-heading"
            className="font-display text-xl font-semibold text-ink"
          >
            Coronel Rosales — real vs. nominal
          </h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">
            Valores expresados en pesos constantes de {baseMonthLabel} (IPC
            INDEC nivel general nacional, serie {coparticipacion.ipcSeriesId})
            frente al monto nominal (sin ajustar) de cada mes.
          </p>
          <div className="mt-4">
            <SvgChart
              series={headlineSeries}
              ariaLabel={`Gráfico de la serie mensual de Coronel Rosales, constante en pesos de ${baseMonthLabel} frente al valor nominal; el detalle exacto está en la tabla siguiente`}
              formatValue={formatArsCompact}
              formatPeriod={formatPeriodEsAr}
              showLastPointLabel
            />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="serie-ajustada-heading">
        <h2
          id="serie-ajustada-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Serie ajustada por inflación — comparación con municipios vecinos
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Valores expresados en pesos constantes de {baseMonthLabel} (IPC
          INDEC nivel general nacional, serie {coparticipacion.ipcSeriesId}).
        </p>
        <div className="mt-6 overflow-x-auto">
          <DataTable
            caption={`Coparticipación mensual ajustada por inflación, en pesos constantes de ${baseMonthLabel}`}
            series={adjustedSeries}
            formatValue={formatArsPlain}
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
        <div className="mt-4 overflow-x-auto">
          <DataTable
            caption="Coparticipación mensual, valores nominales sin ajustar"
            series={nominalSeries}
            formatValue={formatArsPlain}
            formatPeriod={formatPeriodEsAr}
            colorizeBySign
          />
        </div>
      </section>

      <SourcesFooter links={sourceLinks} />
    </div>
  );
}
