import { formatDateEsAr } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { TitularidadRecord } from "@/lib/schemas";

/**
 * Per-proveedor titularidad status, pre-resolved server-side (see
 * `app/adjudicaciones/page.tsx`) so this component never touches the
 * manifest or the titularidad dataset itself -- same "page resolves,
 * component renders" split already used for `AdjudicacionWithSource`.
 */
export type ProveedorTitularidad =
  | { status: "disponible"; record: TitularidadRecord; sourceLink: SourceLink }
  | { status: "no-disponible"; noDisponibleReason: string };

/**
 * Renders the titularidad registral field for one proveedor row in the
 * padrón -- the HIGHEST LEGAL-RISK content on this portal. Every
 * NON-NEGOTIABLE guardrail from DESIGN.md's titularidad decision is
 * enforced HERE, at the single rendering choke point, not left to callers:
 *
 * 1. MINIMIZATION: only nombre + rol are ever read off `record.socios`
 *    (the schema itself carries nothing else -- see `lib/schemas.ts`).
 * 2. DATE-CUT: always "según el edicto de constitución del [fecha]",
 *    NEVER "dueño actual"/"titular hoy" -- plus an explicit sentence that
 *    ownership may have changed since (cesión de cuotas).
 * 3. CERO ADJETIVOS: plain factual sentences only, no adjectives, no
 *    imputation of wrongdoing -- covered by a blocklist test
 *    (`tests/titularidad-field.test.tsx`).
 * 4. PROVENANCE: dual-link (fuente original + copia archivada) + sha256,
 *    same pattern as every other sourced figure on this site.
 * 7. "no disponible públicamente" renders with an honest one-line reason,
 *    never a name -- this is the expected DEFAULT, not an error state.
 */
export function TitularidadField({
  titularidad,
}: {
  proveedor: string;
  titularidad: ProveedorTitularidad;
}) {
  if (titularidad.status === "no-disponible") {
    return (
      <div>
        <dt className="text-[11px] text-muted uppercase">
          Titularidad registral
        </dt>
        <dd className="text-ink">
          Titularidad no disponible públicamente.{" "}
          <span className="text-ink-2">{titularidad.noDisponibleReason}</span>
        </dd>
      </div>
    );
  }

  const { record, sourceLink } = titularidad;

  return (
    <div>
      <dt className="text-[11px] text-muted uppercase">
        Titularidad registral
      </dt>
      <dd className="text-ink">
        <ul className="space-y-0.5">
          {record.socios.map((socio) => (
            <li key={socio.nombre}>
              {socio.nombre} <span className="text-ink-2">— {socio.rol}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 max-w-[60ch] font-sans text-[13px] text-ink-2">
          Según el edicto de constitución del{" "}
          {formatDateEsAr(record.edicionFecha)} ({record.instrumentoLabel}).
          La titularidad puede haber cambiado desde esa fecha (cesión de
          cuotas) — este dato es un hecho registral en una fecha puntual,
          no una afirmación sobre quién es dueño hoy.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-2 font-mono text-[11.5px] break-all text-muted">
          <a href={record.fuenteEdictoUrl} target="_blank" rel="noopener noreferrer">
            Fuente original
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
          <span aria-hidden="true">·</span>
          {sourceLink.archivedUrl ? (
            <a href={sourceLink.archivedUrl} target="_blank" rel="noopener noreferrer">
              Copia archivada
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          ) : (
            <span>copia archivada no disponible</span>
          )}
          <span aria-hidden="true">·</span>
          <span>sha256 {shortHash(sourceLink.sha256)}</span>
        </p>
      </dd>
    </div>
  );
}
