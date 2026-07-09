import type { Metadata } from "next";
import Link from "next/link";
import { AdjudicacionesExplorer } from "@/components/adjudicaciones/AdjudicacionesExplorer";
import type { ProveedorTitularidad } from "@/components/adjudicaciones/TitularidadField";
import { SourcesFooter } from "@/components/SourcesFooter";
import { formatDateEsAr } from "@/lib/format";
import { RECTIFICATION_EMAIL } from "@/lib/site";
import { getPortalData, resolveSourceRef, resolveSourceRefs } from "@/lib/sources";
import { inferUnavailableReason, resolveTitularidad } from "@/lib/titularidad";

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
  const { manifest, adjudicaciones, proveedores, titularidad } = getPortalData();

  const recordsWithSource = adjudicaciones.records.map((record) => ({
    ...record,
    sourceLink: resolveSourceRef(record.sourceRef, manifest),
  }));

  // Pre-resolved server-side, same "page resolves, client component only
  // renders" split as `recordsWithSource` above -- the padrón's titularidad
  // column never touches the manifest/titularidad dataset itself. EVERY
  // proveedor gets an entry: either the curated edicto record (dual-link
  // provenance resolved here) or the honest, generic "no disponible"
  // reason -- "no disponible" is the expected DEFAULT (requirement 7 of
  // the titularidad guardrails), never an error state.
  const titularidadByProveedor: Record<string, ProveedorTitularidad> =
    Object.fromEntries(
      proveedores.proveedores.map((proveedor) => {
        const record = resolveTitularidad(proveedor.proveedor, titularidad);
        if (record) {
          return [
            proveedor.proveedor,
            {
              status: "disponible" as const,
              record,
              sourceLink: resolveSourceRef(record.sourceRef, manifest),
            },
          ];
        }
        return [
          proveedor.proveedor,
          {
            status: "no-disponible" as const,
            noDisponibleReason: inferUnavailableReason(proveedor.proveedor),
          },
        ];
      }),
    );

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
          titularidadByProveedor={titularidadByProveedor}
        />
      </section>

      <section
        aria-labelledby="titularidad-metodologia-heading"
        className="rounded-lg border border-rule bg-surface p-6 shadow-card"
      >
        <h2
          id="titularidad-metodologia-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Titularidad registral: metodología y límites
        </h2>
        <div className="mt-3 max-w-[68ch] space-y-3 text-sm text-ink-2">
          <p>
            Para cada proveedor, la fila «Titularidad registral» del padrón
            muestra quiénes eran sus socios (S.R.L.) o su director al momento
            de constituirse la empresa, según el edicto de constitución
            oficial publicado en el Boletín Oficial correspondiente — leído
            directamente por nosotros, nunca a través de un agregador de
            datos de terceros. La cobertura es parcial y lo decimos de forma
            explícita: solo publicamos un nombre cuando pudimos verificar el
            edicto original en detalle; para el resto de los proveedores, la
            fila muestra «Titularidad no disponible públicamente».
          </p>
          <p>
            Cada socio se muestra únicamente con nombre y rol (socio, socio
            gerente o director) — nunca DNI, domicilio particular, fecha de
            nacimiento ni estado civil, aunque el edicto original los incluya
            (Ley 25.326, art. 4, principio de finalidad). La fecha citada es
            siempre la del edicto de constitución, nunca la titularidad
            actual: la composición societaria puede haber cambiado desde
            entonces por cesión de cuotas.
          </p>
          <p>
            Base legal: el edicto de constitución es una fuente de acceso
            público (Ley 25.326, arts. 5.2 y 11.3) y su publicación es una
            exigencia de la Ley 19.550 (art. 10). Este dato es un hecho
            registral en una fecha puntual, publicado junto al proveedor de
            la misma forma que cualquier otro dato de esta página — sin
            agregar interpretación ni vincularlo a ninguna persona fuera del
            edicto citado.
          </p>
          <p>
            ¿Sos socio de una empresa proveedora y querés rectificar o
            actualizar este dato?{" "}
            <a href={`mailto:${RECTIFICATION_EMAIL}`}>Escribinos</a> (derecho
            de rectificación, Ley 25.326 art. 16 — la AAIP, Agencia de
            Acceso a la Información Pública, es la autoridad de aplicación
            que garantiza este derecho).
          </p>
        </div>
      </section>

      <SourcesFooter
        links={resolveSourceRefs(adjudicaciones.sourceRefs, manifest)}
        note="Cada decreto se archiva de forma individual (copia + sha256), además del boletín completo que lo contiene. Los montos se validan cruzando la cifra en números contra la cifra en letras que trae el propio decreto — si no coinciden, la fila no se publica."
      />
    </div>
  );
}
