import type { Metadata } from "next";
import Link from "next/link";
import { AdjudicacionesExplorer } from "@/components/adjudicaciones/AdjudicacionesExplorer";
import { SourcesFooter } from "@/components/SourcesFooter";
import { formatDateEsAr } from "@/lib/format";
import { getPortalData, resolveSourceRef, resolveSourceRefs } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Adjudicaciones",
  description:
    "Adjudicaciones publicadas por la Municipalidad de Coronel Rosales en su Boletín Oficial (SIBOM): proveedor, monto, decreto y expediente de cada licitación, concurso o compra que pasó por un acto administrativo.",
};

/**
 * /adjudicaciones — SIBOM adjudicaciones monitor + reconstructed proveedores
 * padrón (feature G3). This is the ONLY public source with a named vendor
 * alongside an exact amount for municipal procurement (see
 * `etl/etl/sibom_adjudicaciones.py`'s module docstring: the RAFAM budget
 * report at `/gastos` has amounts but never vendors).
 *
 * SENSITIVITY (non-negotiable framing, matches the ETL module's own
 * correctness gate): every row is a literal fact stated in an official
 * decreto -- vendor, amount, tender number, expediente, date -- with zero
 * added adjectives or insinuation. "Adjudicaciones publicadas por el
 * municipio en su Boletín Oficial" is the frame: a neutral public record,
 * not an accusation. A row only exists here when the ETL parser could
 * extract vendor + amount + decreto UNAMBIGUOUSLY (including a
 * spelled-vs-numeric amount cross-check) -- ambiguous acts are skipped, not
 * guessed, and that skip count is disclosed below as visible proof, not
 * hidden.
 *
 * Data-flow decision (DESIGN.md INVIOLABLE #4): both `data/adjudicaciones.json`
 * and `data/proveedores.json` are read server-side at build time
 * (`getPortalData()`) and passed as plain props into
 * `AdjudicacionesExplorer`, the page's only client island (search/sort/tab
 * state) -- never a browser-side fetch. Each row's own `SourceLink` is
 * pre-resolved here (not in the client component) so the client never needs
 * the full manifest, only the small slice of provenance it actually renders.
 */
export default function AdjudicacionesPage() {
  const { manifest, adjudicaciones, proveedores } = getPortalData();

  const recordsWithSource = adjudicaciones.records.map((record) => ({
    ...record,
    sourceLink: resolveSourceRef(record.sourceRef, manifest),
  }));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿A quién le compró el municipio?
        </h1>
        <p className="mt-3 font-mono text-sm font-semibold tracking-[0.1em] text-stamp uppercase sm:text-base">
          Adjudicaciones publicadas por el municipio en su Boletín Oficial ·
          Fuente: SIBOM (sibom.slyt.gba.gob.ar)
        </p>

        <div className="mt-5 max-w-[72ch] space-y-2 text-ink">
          <p>
            Cada fila es un decreto municipal publicado en el Boletín Oficial
            que adjudica una licitación, concurso o compra a un proveedor
            puntual. El proveedor, el monto y el número de decreto son datos
            que el propio municipio publicó — esta página no agrega ni
            interpreta nada, solo los junta en una tabla buscable.
          </p>
        </div>

        <div className="mt-5 max-w-[74ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
          <h2 className="font-sans text-sm font-bold text-ink">
            Qué es esto — y qué NO es
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
            Esto cubre solo el gasto que pasa por licitación, concurso o
            decreto y que el municipio publicó en su Boletín Oficial. NO
            incluye compras directas por debajo de los montos que exigen
            licitación, ni los sueldos. El detalle completo de gastos no es
            público — <Link href="/pedidos">pedilo acá</Link>.
          </p>
        </div>

        <p className="mt-4 max-w-[72ch] text-sm text-ink-2">
          Revisamos {adjudicaciones.bulletinsScanned} boletines oficiales (
          {adjudicaciones.windowFrom
            ? formatDateEsAr(adjudicaciones.windowFrom)
            : "sin datos"}{" "}
          a{" "}
          {adjudicaciones.windowTo
            ? formatDateEsAr(adjudicaciones.windowTo)
            : "sin datos"}
          ) y {adjudicaciones.decreesScanned} decretos.{" "}
          {adjudicaciones.skippedCount} actos no pudieron parsearse de forma
          automática con la certeza que exigimos (proveedor, monto y decreto
          sin ambigüedad) y quedaron afuera — preferimos publicar menos filas
          antes que arriesgar un dato mal leído.
        </p>
      </section>

      <section aria-labelledby="explorador-heading">
        <h2 id="explorador-heading" className="sr-only">
          Explorador de adjudicaciones y padrón de proveedores
        </h2>
        <AdjudicacionesExplorer
          records={recordsWithSource}
          proveedores={proveedores.proveedores}
        />
      </section>

      <SourcesFooter
        links={resolveSourceRefs(adjudicaciones.sourceRefs, manifest)}
        note="Cada decreto se archiva de forma individual (copia + sha256), además del boletín completo que lo contiene. Los montos se validan cruzando la cifra en números contra la cifra en letras que trae el propio decreto — si no coinciden, la fila no se publica."
      />
    </div>
  );
}
