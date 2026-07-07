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

export default function CoparticipacionPage() {
  const { coparticipacion, manifest } = getPortalData();

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
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Coparticipación municipal
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Serie mensual de fondos de coparticipación recibidos por Coronel
          Rosales, comparada con los municipios vecinos de Bahía Blanca, Monte
          Hermoso y Villarino.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Datos hasta {dataThroughLabel}. {coparticipacion.lagNote}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          El monto mensual mostrado es la suma de todos los conceptos que
          integran la transferencia de coparticipación (Coparticipación
          Bruta, Fondo Educativo, Descentralización Tributaria y otros),
          no solo el concepto &quot;Coparticipación Bruta&quot; —
          más detalle en{" "}
          <Link href="/fuentes" className="underline underline-offset-2">
            Fuentes y metodología
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="serie-ajustada-heading">
        <h2
          id="serie-ajustada-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Serie ajustada por inflación
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Valores expresados en pesos constantes de {baseMonthLabel} (IPC
          INDEC nivel general nacional, serie {coparticipacion.ipcSeriesId}).
        </p>
        <div className="mt-4">
          <SvgChart
            series={adjustedSeries}
            ariaLabel={`Gráfico de la serie mensual de coparticipación ajustada por inflación en pesos constantes de ${baseMonthLabel}; el detalle exacto está en la tabla siguiente`}
            formatValue={formatArsCompact}
            formatPeriod={formatPeriodEsAr}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <DataTable
            caption={`Coparticipación mensual ajustada por inflación, en pesos constantes de ${baseMonthLabel}`}
            series={adjustedSeries}
            formatValue={formatArsPlain}
            formatPeriod={formatPeriodEsAr}
          />
        </div>
      </section>

      <section aria-labelledby="serie-nominal-heading">
        <h2
          id="serie-nominal-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Valores nominales (sin ajustar)
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
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
          />
        </div>
      </section>

      <SourcesFooter links={sourceLinks} note={coparticipacion.lagNote} />
    </div>
  );
}
