import Link from "next/link";
import { PresupuestoEjecucionSection } from "@/components/presupuesto-ejecucion/PresupuestoEjecucionSection";
import { SourcesFooter } from "@/components/SourcesFooter";
import { buildAreaEjecucion } from "@/lib/presupuestoEjecucion";
import { buildPageMetadata } from "@/lib/seo";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "¿Cumplen lo que prometieron?",
  description:
    "Presupuesto vigente contra ejecutado (devengado), área por área, según el mismo reporte oficial (RAFAM) que usa el explorador de gasto por partida de Coronel Rosales.",
  path: "/gastos/cumplen",
});

/**
 * /gastos/cumplen -- "¿Cumplen lo que prometieron?" (feature H1). IA
 * consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): this
 * used to be a section embedded directly on `/gastos`; it is now the
 * SECOND tab of the Gastos door (`SectionTabs`, wired via
 * `app/gastos/layout.tsx`'s nested-layout inheritance) so it has its own
 * deep-linkable, independently prerendered URL -- the home page's own row
 * now links straight here (`/gastos/cumplen`) instead of a `#cumplen-heading`
 * anchor within `/gastos`.
 *
 * Same reconciled `data/gasto-partida.json` as `/gastos` (feature G2), the
 * SAME jurisdicciones re-grouped one level up (Objeto del Gasto ->
 * Jurisdicción/área) -- no new ETL artifact, see `lib/presupuestoEjecucion.ts`.
 * `PresupuestoEjecucionSection` itself is unchanged (still a plain, "cero
 * JS" server component, still owns its own level-2 heading + honesty
 * caveats) -- only its ROUTE changed. The page's own `<h1>` stays
 * `sr-only` (same pattern `app/page.tsx` uses for its home `<h1>`) so a
 * screen reader gets a proper top-level heading without visually repeating
 * the section's own "¿Cumplen lo que prometieron?" question a second time.
 */
export default function GastosCumplenPage() {
  const { gastoPartida, manifest } = getPortalData();
  const { period, jurisdicciones } = gastoPartida;
  const areas = buildAreaEjecucion(jurisdicciones);

  return (
    <div className="space-y-8">
      <h1 className="sr-only">
        ¿Cumplen lo que prometieron? — presupuesto vs. ejecución por área
      </h1>

      <p className="max-w-[72ch] text-sm text-ink-2">
        Mismo dato reconciliado que{" "}
        <Link href="/gastos">el detalle de gasto por partida</Link>, del{" "}
        {period.label}, re-agrupado por área (Jurisdicción) en vez de por
        objeto del gasto.
      </p>

      <PresupuestoEjecucionSection areas={areas} periodLabel={period.label} />

      <SourcesFooter
        links={resolveSourceRefs(gastoPartida.sourceRefs, manifest)}
        note={`Datos del ${period.label} (del ${period.from.split("-").reverse().join("/")} al ${period.to.split("-").reverse().join("/")}). Mismo reporte oficial (R.A.F.A.M.) que "Por partida", re-agrupado por área/jurisdicción.`}
      />
    </div>
  );
}
