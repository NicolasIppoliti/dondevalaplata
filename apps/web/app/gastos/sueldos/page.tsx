import Link from "next/link";
import { PersonalSection } from "@/components/personal/PersonalSection";
import { SourcesFooter } from "@/components/SourcesFooter";
import {
  personalByArea,
  personalShareOfTotal,
  personalTotals,
} from "@/lib/personal";
import { buildPageMetadata } from "@/lib/seo";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "¿Cuánto se va en sueldos?",
  description:
    "Total del gasto en personal devengado por el municipio de Coronel Rosales, qué porcentaje del presupuesto representa, y por qué el detalle de quién cobra cuánto no es público (Ordenanza 3638, Art. 11).",
  path: "/gastos/sueldos",
});

/**
 * /gastos/sueldos -- "¿Cuánto se va en sueldos?", the fourth tab of the
 * Gastos door (`SectionTabs`, wired via `app/gastos/layout.tsx`'s
 * nested-layout inheritance). Same reconciled `data/gasto-partida.json` as
 * `/gastos` (G2) and `/gastos/cumplen` (H1) -- no new ETL artifact, see
 * `lib/personal.ts`'s "no new ETL artifact" decision.
 *
 * THE POINT of this route is the honest caveat, not the total (see
 * `PersonalSection`'s own docstring): the total/percentage below are the
 * AGGREGATE object-level figure, never a per-official/per-agent breakdown
 * -- that itemized detail is not public (Ordenanza 3638 Art. 11
 * non-compliance, same pattern already documented for the reconstructed
 * proveedores padrón in `AdjudicacionesExplorer`).
 */
export default function GastosSueldosPage() {
  const { gastoPartida, manifest } = getPortalData();
  const { period, jurisdicciones, reconciliation } = gastoPartida;
  const totals = personalTotals(jurisdicciones);
  const areas = personalByArea(jurisdicciones);
  const shareOfTotal = personalShareOfTotal(
    totals.devengadoArs,
    reconciliation.totalDevengadoArs,
  );

  return (
    <div className="space-y-8">
      <h1 className="sr-only">
        ¿Cuánto se va en sueldos? — gasto en personal del municipio
      </h1>

      <p className="max-w-[72ch] text-sm text-ink-2">
        Mismo dato reconciliado que{" "}
        <Link href="/gastos">el detalle de gasto por partida</Link>, del{" "}
        {period.label}: la suma de todo objeto del gasto clasificado como
        &quot;Gastos en Personal&quot;.
      </p>

      <PersonalSection
        totals={totals}
        areas={areas}
        shareOfTotal={shareOfTotal}
        periodLabel={period.label}
      />

      <SourcesFooter
        links={resolveSourceRefs(gastoPartida.sourceRefs, manifest)}
        note={`Datos del ${period.label} (del ${period.from.split("-").reverse().join("/")} al ${period.to.split("-").reverse().join("/")}). "Gastos en Personal" es el objeto del gasto principal código 1 del clasificador presupuestario que usa el propio municipio.`}
      />
    </div>
  );
}
