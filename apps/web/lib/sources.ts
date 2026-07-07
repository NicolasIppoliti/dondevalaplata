import {
  loadCoparticipacion,
  loadFallos,
  loadManifest,
  loadTransparencia,
} from "./data";
import type {
  CoparticipacionData,
  FallosData,
  Manifest,
  ManifestRecord,
  TransparenciaData,
} from "./schemas";

/**
 * Dual-link provenance: every displayed figure or ruling on the site must
 * resolve to a manifest record carrying BOTH the original official URL and
 * the portal's own archived copy (source-provenance capability).
 */
export interface SourceLink {
  id: string;
  source: string;
  sourceUrl: string;
  archivedUrl: string | null;
  sha256: string;
  fetchedAt: string;
}

function toSourceLink(record: ManifestRecord): SourceLink {
  return {
    id: record.id,
    source: record.source,
    sourceUrl: record.source_url,
    archivedUrl: record.archived_url,
    sha256: record.sha256,
    fetchedAt: record.fetched_at,
  };
}

export function resolveSourceRef(id: string, manifest: Manifest): SourceLink {
  const record = manifest.find((entry) => entry.id === id);
  if (!record) {
    throw new Error(
      `source-provenance violation: sourceRefs id "${id}" does not resolve to any archive-manifest.json record`,
    );
  }
  return toSourceLink(record);
}

export function resolveSourceRefs(
  ids: string[],
  manifest: Manifest,
): SourceLink[] {
  return ids.map((id) => resolveSourceRef(id, manifest));
}

/** Shortens a sha256 hex digest to a readable, still-distinctive prefix. */
export function shortHash(sha256: string, length = 11): string {
  return `${sha256.slice(0, length)}…`;
}

/** Collects every sourceRefs id referenced by the display JSON, deduplicated. */
export function collectSourceRefs(
  coparticipacion: CoparticipacionData,
  fallos: FallosData,
  transparencia?: TransparenciaData,
): string[] {
  const ids = new Set<string>();
  for (const id of coparticipacion.sourceRefs) ids.add(id);
  for (const series of coparticipacion.series) {
    for (const id of series.sourceRefs) ids.add(id);
  }
  for (const id of fallos.sourceRefs) ids.add(id);
  for (const record of fallos.records) {
    for (const id of record.sourceRefs) ids.add(id);
  }
  if (transparencia) {
    for (const id of transparencia.sourceRefs) ids.add(id);
    for (const point of transparencia.trend) ids.add(point.sourceRef);
  }
  return [...ids];
}

/**
 * Build-invariant (raw-data-archive + source-provenance): every sourceRefs id
 * used anywhere in the display JSON MUST resolve to an archive-manifest.json
 * record. Throws an aggregate error listing every dangling id so the build
 * fails loudly instead of silently rendering a broken provenance link.
 */
export function assertSourceRefsResolve(
  ids: string[],
  manifest: Manifest,
): void {
  const knownIds = new Set(manifest.map((record) => record.id));
  const missing = ids.filter((id) => !knownIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `source-provenance build invariant failed: ${missing.length} sourceRefs id(s) do not resolve to any archive-manifest.json record: ${missing.join(", ")}`,
    );
  }
}

/**
 * Distinct ejercicios present in the fallos data, ordered newest first
 * (recency-order capability). This governs ONLY presentation order --
 * every ejercicio and every record within it stays fully listed elsewhere;
 * nothing is dropped, hidden or collapsed by this function. The current
 * administration's ejercicio naturally leads the list simply because it is
 * the most recent year, not because any other administration was demoted.
 */
export function getFalloEjerciciosDescending(fallos: FallosData): string[] {
  const ejercicios = [
    ...new Set(fallos.records.map((record) => record.ejercicio)),
  ];
  return ejercicios.sort((a, b) => Number(b) - Number(a));
}

export interface PortalData {
  manifest: Manifest;
  coparticipacion: CoparticipacionData;
  fallos: FallosData;
  transparencia: TransparenciaData;
}

/**
 * Single build-time entry point pages use to read validated portal data.
 * Runs the source-provenance build invariant as a side effect — any dangling
 * sourceRefs id fails `next build` rather than shipping a broken link.
 */
export function getPortalData(): PortalData {
  const manifest = loadManifest();
  const coparticipacion = loadCoparticipacion();
  const fallos = loadFallos();
  const transparencia = loadTransparencia();
  assertSourceRefsResolve(
    collectSourceRefs(coparticipacion, fallos, transparencia),
    manifest,
  );
  return { manifest, coparticipacion, fallos, transparencia };
}
