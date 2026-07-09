import type { TitularidadData, TitularidadRecord } from "./schemas";

/**
 * Pure helpers for the titularidad registral field -- the HIGHEST
 * LEGAL-RISK data this portal publishes. See DESIGN.md's titularidad
 * decision entry and `etl/etl/titularidad.py`'s module docstring for the
 * full guardrail rationale before touching this file.
 */

function normalizeVendorKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Resolves a proveedor's own curated titularidad record by EXACT
 * (whitespace/case-normalized) match against that record's own
 * `vendorMatchKeys` -- e.g. both "EQUIPO..."/"EQUIPOS..." spellings of
 * the same real RUMAX entity. NEVER fuzzy-matched: a proveedor with no
 * listed match key gets `null` here, and the web layer's default
 * rendering is "Titularidad no disponible públicamente" (see
 * `inferUnavailableReason` below), never a guess.
 */
export function resolveTitularidad(
  proveedor: string,
  titularidad: TitularidadData,
): TitularidadRecord | null {
  const key = normalizeVendorKey(proveedor);
  return (
    titularidad.records.find((record) =>
      record.vendorMatchKeys.some((matchKey) => normalizeVendorKey(matchKey) === key),
    ) ?? null
  );
}

const SA_SUFFIX_PATTERN = /\bS\.?A\.?$/i;

/**
 * Honest, generic reason a vendor's titularidad is "no disponible
 * públicamente" when no curated edicto record exists for it -- inferred
 * ONLY from the vendor's own publicly-stated corporate form (S.A. vs.
 * everything else), never a claim about a SPECIFIC vendor's ownership.
 *
 * S.A. (sociedad anónima): shareholders are private by law (art. 213,
 * Ley 19.550) and never appear in a public edicto de constitución the way
 * an S.R.L.'s socios do. Every other form: this portal simply has not
 * yet verified a primary official edicto for that vendor -- a coverage
 * gap, not a legal barrier, and openly stated as such.
 */
export function inferUnavailableReason(proveedor: string): string {
  const isSA = SA_SUFFIX_PATTERN.test(proveedor.trim());
  return isSA
    ? "es una S.A.: sus accionistas son privados por ley (art. 213, Ley 19.550) y no figuran en un edicto público."
    : "todavía no verificamos un edicto oficial que confirme su titularidad societaria.";
}
