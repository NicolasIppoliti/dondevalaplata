import Link from "next/link";
import { GastoPartidaExplorer } from "@/components/gasto-partida/GastoPartidaExplorer";
import { SourcesFooter } from "@/components/SourcesFooter";
import { formatArsPlain } from "@/lib/format";
import { buildPageMetadata } from "@/lib/seo";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "Gasto por partida",
  description:
    "Explorador del presupuesto municipal ejecutado, partida por partida, según el propio reporte oficial (RAFAM) de Coronel Rosales.",
  path: "/gastos",
});

/**
 * /gastos — "gasto por partida" explorer (feature G2). This is the MAXIMUM
 * public granularity of the municipal budget: Jurisdicción x Apertura
 * Programática x Objeto del Gasto, straight from the RAFAM "Estado de
 * Ejecución del Presupuesto de Gastos" PDF the municipality itself
 * publishes. There are NO vendors/CUIT here -- see the caveat below.
 *
 * Data-flow decision (DESIGN.md INVIOLABLE #4, "nunca un fetch de datos en
 * el navegador"): the ~1200-leaf tree is read server-side at build time
 * (`getPortalData()`, same as every other page) and passed as a plain prop
 * into `GastoPartidaExplorer`, a small client island that owns ONLY the
 * search/expand interaction -- never a `public/`-served JSON fetched by
 * the browser. The task brief offered a client-fetch alternative
 * explicitly to manage payload size; this keeps the SAME size-management
 * outcome (a pruned 3-level tree -- see `etl/etl/gasto_partida.py`'s
 * module docstring -- ~200KB uncompressed, ~1200 leaves) while staying
 * consistent with every other interactive chart already on this site
 * (`InteractiveCoparticipacionChart`, `TransparenciaGauge`) and with the
 * INVIOLABLE rule itself, which the task's own "decide and document"
 * framing anticipates might need reconciling with a competing constraint.
 *
 * Correctness disclosure: the ETL build itself REFUSES to write
 * `data/gasto-partida.json` unless the sum of every parsed leaf partida
 * reconciles against the PDF's own "TOTALES GENERALES" row (see
 * `build_gasto_partida`'s honesty gate) -- the reconciliation figures are
 * surfaced here as visible proof, not just trusted silently.
 *
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): this
 * page is now the "Por partida" TAB of the Gastos door (`SectionTabs`,
 * wired in `app/gastos/layout.tsx` -- that shared layout also covers
 * `/gastos/cumplen` via Next's nested-layout inheritance, and
 * `app/adjudicaciones/layout.tsx` renders the SAME tab bar for the third
 * tab). Feature H1 ("¿Cumplen lo que prometieron?") used to be a section
 * ON this page; it now lives at its own route, `/gastos/cumplen`
 * (`app/gastos/cumplen/page.tsx`) -- same reconciled data, re-grouped one
 * level up, just promoted to a real prerendered tab instead of an in-page
 * anchor, so it stays deep-linkable/shareable on its own URL. See that
 * file's own docstring for the H1 feature history.
 */
export default function GastosPage() {
  const { gastoPartida, manifest } = getPortalData();
  const { period, reconciliation, jurisdicciones } = gastoPartida;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿En qué gastó el municipio, partida por partida?
        </h1>
        <p className="mt-3 font-mono text-sm font-semibold tracking-[0.1em] text-stamp uppercase sm:text-base">
          Datos del {period.label} · Fuente: R.A.F.A.M., Municipalidad de
          Coronel Rosales
        </p>

        <div className="mt-5 max-w-[72ch] space-y-2 text-ink">
          <p>
            <strong className="text-ink">Vigente</strong> es el presupuesto ya
            actualizado para esa partida en este período.{" "}
            <strong className="text-ink">Devengado</strong> es lo que el
            municipio ya se comprometió formalmente a pagar, haya salido la
            plata o no. <strong className="text-ink">Pagado</strong> es lo
            que efectivamente salió de la caja municipal.
          </p>
        </div>

        <div className="mt-5 max-w-[74ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
          <h2 className="font-sans text-sm font-bold text-ink">
            Qué es esto — y qué NO es
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
            Este es el máximo detalle público del PRESUPUESTO que publica la
            Municipalidad: no incluye proveedores ni órdenes de compra
            individuales. Ese dato vive en otra fuente pública — el Boletín
            Oficial de compras (SIBOM) — que sí está incorporada al portal en{" "}
            <Link href="/adjudicaciones">¿A quién le compró el municipio?</Link>
            . Si necesitás un detalle que ninguna de las dos cubre (por
            ejemplo, compras directas por debajo del monto que exige
            licitación), el detalle completo no es público —{" "}
            <Link href="/pedidos">pedilo acá</Link>.
          </p>
        </div>

        <p className="mt-4 max-w-[72ch] text-sm text-ink-2">
          Verificamos que la suma de las {reconciliation.leafCount} partidas
          de este listado coincide, hasta el centavo, con el total que el
          propio documento oficial publica ({" "}
          {formatArsPlain(reconciliation.totalDevengadoArs)} devengados en
          total). Si alguna vez esa cuenta no cerrara, esta página dejaría de
          publicarse antes que mostrar un número dudoso.
        </p>
      </section>

      <section aria-labelledby="explorador-heading">
        <h2 id="explorador-heading" className="font-display text-xl font-semibold text-ink">
          Ver el detalle completo, partida por partida
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-sm text-muted">
          El mismo dato de arriba, abierto hasta el objeto del gasto más
          desagregado que la Municipalidad publica.
        </p>
        <div className="mt-4">
          <GastoPartidaExplorer jurisdicciones={jurisdicciones} />
        </div>
      </section>

      <SourcesFooter
        links={resolveSourceRefs(gastoPartida.sourceRefs, manifest)}
        note={`Datos del ${period.label} (del ${period.from.split("-").reverse().join("/")} al ${period.to.split("-").reverse().join("/")}). El "Objeto del Gasto" es el nivel más desagregado que la Municipalidad publica públicamente para su presupuesto de gastos.`}
      />
    </div>
  );
}
