import type { AdjudicacionRecord, ProveedorRecord } from "./schemas";

/**
 * Pure helpers for the SIBOM adjudicaciones monitor (feature G3): free-text
 * search and sort over both the adjudicaciones table and the reconstructed
 * proveedores padrón. No React here -- unit-tested directly, independent of
 * rendering; the only consumer is `components/adjudicaciones/*`.
 */

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesQuery(query: string, ...texts: (string | null)[]): boolean {
  if (!query.trim()) return true;
  const normalizedQuery = normalizeSearchText(query);
  return texts.some(
    (text) => text != null && normalizeSearchText(text).includes(normalizedQuery),
  );
}

/**
 * Matches against vendor, decreto number, expediente, procedimiento and
 * objeto -- every field visible in a row, so a search for a tender number
 * or a keyword from the objeto text finds the same row a vendor-name search
 * would.
 *
 * Generic over `T extends AdjudicacionRecord` so callers can pass a record
 * enriched with extra fields (e.g. the page's own `sourceLink`, resolved
 * server-side) without TypeScript widening the return type back down to
 * the bare schema shape and dropping those fields.
 */
export function filterAdjudicaciones<T extends AdjudicacionRecord>(
  records: T[],
  query: string,
): T[] {
  return records.filter((record) =>
    matchesQuery(
      query,
      record.proveedor,
      record.decreto,
      record.expediente,
      record.procedimiento,
      record.objeto,
    ),
  );
}

export type AdjudicacionSortKey = "fecha" | "proveedor" | "montoArs";
export type SortDirection = "asc" | "desc";

/** Never mutates the input -- returns a new sorted array. */
export function sortAdjudicaciones<T extends AdjudicacionRecord>(
  records: T[],
  key: AdjudicacionSortKey,
  direction: SortDirection,
): T[] {
  const sorted = [...records].sort((a, b) => {
    if (key === "montoArs") return a.montoArs - b.montoArs;
    if (key === "fecha") return a.fecha.localeCompare(b.fecha);
    return a.proveedor.localeCompare(b.proveedor, "es");
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function filterProveedores(
  proveedores: ProveedorRecord[],
  query: string,
): ProveedorRecord[] {
  return proveedores.filter((proveedor) =>
    matchesQuery(query, proveedor.proveedor, ...proveedor.decretoRefs),
  );
}

export type ProveedorSortKey = "proveedor" | "totalArs" | "count";

export function sortProveedores(
  proveedores: ProveedorRecord[],
  key: ProveedorSortKey,
  direction: SortDirection,
): ProveedorRecord[] {
  const sorted = [...proveedores].sort((a, b) => {
    if (key === "totalArs") return a.totalArs - b.totalArs;
    if (key === "count") return a.count - b.count;
    return a.proveedor.localeCompare(b.proveedor, "es");
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}
