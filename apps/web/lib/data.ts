import manifestJson from "../../../archive-manifest.json";
import coparticipacionJson from "../../../data/coparticipacion.json";
import fallosJson from "../../../data/fallos.json";
import {
  coparticipacionDataSchema,
  fallosDataSchema,
  manifestSchema,
  type CoparticipacionData,
  type FallosData,
  type Manifest,
} from "./schemas";

/**
 * Build-time-only data loaders. Every value is read from the versioned JSON
 * artifacts produced by the ETL pipeline (`data/*.json`,
 * `archive-manifest.json`) and validated with zod at this boundary — never
 * `any`, never a runtime fetch. Each loader accepts an optional `raw`
 * argument so callers (and tests) can validate arbitrary fixtures instead of
 * the real repo data.
 */

export function loadManifest(raw: unknown = manifestJson): Manifest {
  return manifestSchema.parse(raw);
}

export function loadCoparticipacion(
  raw: unknown = coparticipacionJson,
): CoparticipacionData {
  return coparticipacionDataSchema.parse(raw);
}

export function loadFallos(raw: unknown = fallosJson): FallosData {
  return fallosDataSchema.parse(raw);
}
