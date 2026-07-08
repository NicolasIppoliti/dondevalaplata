import { SvgChart } from "@/components/chart/SvgChart";
import { DataTable } from "@/components/chart/DataTable";
import { listMissingQuarterLabels } from "@/lib/deudaHistorica";
import { formatArsHuman, formatArsPlain, formatDateEsAr } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { CadenciaDeuda, DeudaHistoricaData } from "@/lib/schemas";

/**
 * DeudaHistoricaChart (feature H2a): the "deuda pública histórica" series
 * -- server-rendered inline SVG (DESIGN.md canonical chart style, zero
 * client JS) showing the 3 quarters the municipality ever published
 * (1er/2do/3er trimestre 2025), plus a visually explicit "acá dejaron de
 * publicar" marker for what has been missing since -- the SAME live figures
 * (`elapsedDays`/`quartersMissing`) `DeudaCounter` (feature G1) already
 * computes at ETL build time from `data/cadencia.json`, reused here rather
 * than re-derived, so the two widgets never disagree on the gap. The marker
 * uses the `--ocre` "aviso documental" token (never `--stamp`/alarm-red):
 * this is a documented publication-cadence fact, not a judgment of any
 * person or gestión (DESIGN.md INVIOLABLE rule #1).
 *
 * Composition breakdown ("¿a quién le debe el municipio?") is deliberately
 * NOT shown: the source PDFs' own internal sub-totals (Deuda Pública
 * Consolidada / Contingente / Flotante) do not reconcile against the
 * headline total in the one quarter with enough visible detail to check --
 * see `etl/etl/deuda_historica.py`'s module docstring. Publishing only
 * what reconciles, never a guessed breakdown, honestly disclosed below the
 * chart.
 */
interface DeudaHistoricaChartProps {
  deudaHistorica: DeudaHistoricaData;
  deuda: CadenciaDeuda;
  sourceLinks: SourceLink[];
}

export function DeudaHistoricaChart({
  deudaHistorica,
  deuda,
  sourceLinks,
}: DeudaHistoricaChartProps) {
  const periodLabelByPeriod = new Map(
    deudaHistorica.series.map((point) => [point.period, point.periodLabel]),
  );
  const missingQuarterLabels = listMissingQuarterLabels(
    deuda.lastPeriodEnd,
    deuda.quartersMissing,
  );

  const series = [
    {
      id: "deuda-historica",
      label: "Deuda pública (stock total)",
      points: deudaHistorica.series.map((point) => ({
        period: point.period,
        value: point.totalArs,
      })),
    },
  ];

  return (
    <section
      aria-labelledby="deuda-historica-heading"
      className="rounded-lg border border-rule bg-surface p-[clamp(20px,3vw,30px)] shadow-card"
    >
      <h2
        id="deuda-historica-heading"
        className="font-display text-xl font-semibold text-ink"
      >
        ¿Cómo evolucionó la deuda pública?
      </h2>
      <p className="mt-1 max-w-[62ch] text-sm text-ink-2">
        Stock total de deuda pública declarado por el municipio, trimestre a
        trimestre — los únicos {deudaHistorica.series.length} que publicó
        antes de dejar de actualizar la serie.
      </p>

      <div className="mt-5">
        <SvgChart
          series={series}
          ariaLabel="Deuda pública histórica, por trimestre"
          formatValue={formatArsHuman}
          formatPeriod={(period) => periodLabelByPeriod.get(period) ?? period}
          showLastPointLabel
          showLegend={false}
          axisUnitLabel="Montos en pesos, stock total de deuda pública (sin ajustar por inflación)"
        />
      </div>

      {/* Visually explicit "acá dejaron de publicar" marker -- same token
          (`--ocre`, border izquierdo 5px) as `DeudaCounter`'s "aviso
          documental" treatment, never `--stamp`/alarma: this is a
          documented fact about a publication cadence, not a judgment. */}
      <div className="mt-5 rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
        <p className="font-sans text-sm font-bold text-ink">
          <span aria-hidden="true">⏸ </span>
          Acá dejaron de publicar
        </p>
        <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
          Después del {formatDateEsAr(deuda.lastPeriodEnd)} ({deuda.lastPeriod}
          ), el municipio no volvió a publicar el Stock de deuda. Faltan:{" "}
          <strong className="text-ink">{missingQuarterLabels.join(", ")}</strong>
          . Van {deuda.elapsedDays} días ({deuda.quartersMissing} trimestres)
          sin actualizar.
        </p>
      </div>

      <div className="mt-5">
        <DataTable
          caption="Deuda pública histórica, por trimestre"
          series={series}
          formatValue={formatArsHuman}
          formatFullPrecision={formatArsPlain}
          formatPeriod={(period) => periodLabelByPeriod.get(period) ?? period}
          periodColumnLabel="Trimestre"
          colorizeBySign
        />
      </div>

      {/* Honesty disclosure (never fabricate a breakdown it cannot verify)
          -- see `etl/etl/deuda_historica.py` module docstring for the full
          reconciliation attempt and why it was dropped. */}
      <p className="mt-4 max-w-[68ch] text-xs text-muted">
        Este total no incluye un desglose por organismo acreedor (Tesoro
        Provincial, Fondo de Emergencia Sanitaria, etc.): los propios
        subtotales del documento no reconcilian de forma verificable contra
        el total en al menos un trimestre, así que se publica únicamente la
        cifra que sí se pudo verificar. El PDF completo, citado abajo, tiene
        el detalle línea por línea para quien lo quiera revisar.
      </p>

      <ul className="mt-4 space-y-2">
        {sourceLinks.map((link, index) => (
          <li key={link.id} className="font-mono text-[11.5px] break-all text-muted">
            <span className="text-ink-2">
              {periodLabelByPeriod.get(deudaHistorica.series[index]?.period ?? "") ??
                link.id}
              :{" "}
            </span>
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
    </section>
  );
}
