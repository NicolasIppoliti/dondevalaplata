import type { Metadata } from "next";
import { NovedadesFeed } from "@/components/novedades/NovedadesFeed";
import { SourcesFooter } from "@/components/SourcesFooter";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Novedades",
  description:
    "Qué publicó el municipio y cuándo, y qué sigue sin actualizar — un registro neutral de comportamiento de transparencia.",
};

/**
 * /novedades -- "¿Qué publicó el municipio últimamente?" (feature H2b, the
 * watchdog "novedades" feed). Reads `data/novedades.json`
 * (`etl/etl/novedades.py`), a neutral, factual log: what the municipio
 * published and when, and what remains unpublished past the ASAP/Ordenanza
 * 3638 expectations -- never an accusation, always a documented, sourced
 * fact. Every event's `kind` is visibly labeled by `NovedadesFeed`
 * (seeded/auto-detected/auto-stale), per the HONESTY requirement that
 * hand-curated facts are never blended silently with computed ones.
 *
 * Mechanism (stated explicitly on the page, not just in code comments): a
 * monthly cron re-archives the mcr.gob.ar "documentos" listing and diffs
 * it against the PREVIOUS archived snapshot -- any newly published document
 * becomes a new `auto-detected` entry, appended to the log forever (it is
 * a historical fact); the `auto-stale` rows are re-derived fresh every
 * build from the already-computed `data/cadencia.json`, never independently
 * recomputed. This is the recurring-content engine: the log only grows.
 */
export default function NovedadesPage() {
  const { novedades, manifest } = getPortalData();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Qué publicó el municipio últimamente?
        </h1>
        <p className="mt-3 max-w-[68ch] text-ink-2">
          Un registro neutral de comportamiento de transparencia: qué
          documentos publicó el municipio y cuándo, y qué sigue sin
          actualizar respecto de lo que exige la Ordenanza 3638 y mide el
          índice ASAP.
        </p>
        <p className="mt-3 max-w-[68ch] rounded-md border border-rule bg-surface-2 p-4 text-sm text-ink-2">
          <strong className="text-ink">Cómo se arma este registro:</strong>{" "}
          cada mes, un proceso automático vuelve a archivar el listado
          oficial de documentos de mcr.gob.ar y lo compara (diff) contra la
          copia archivada el mes anterior — cada documento nuevo se suma
          acá como una novedad, sin borrar nunca las anteriores. Lo que
          sigue sin publicarse se recalcula en cada actualización a partir
          de los mismos datos en vivo de <code>/transparencia</code>, nunca
          inventado.
        </p>
      </section>

      <section aria-labelledby="novedades-heading">
        <h2 id="novedades-heading" className="sr-only">
          Novedades
        </h2>
        <NovedadesFeed novedades={novedades} />
      </section>

      <SourcesFooter
        links={resolveSourceRefs(novedades.sourceRefs, manifest)}
        note="Los eventos marcados 'dato verificado a mano' son hechos verificados por el dueño del portal contra la fuente oficial. Los marcados 'estado en vivo' se recalculan en cada actualización a partir de data/cadencia.json. Los marcados 'detectado automáticamente' surgen de comparar dos capturas archivadas del listado oficial."
      />
    </div>
  );
}
