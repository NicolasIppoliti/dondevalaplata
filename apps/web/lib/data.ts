import manifestJson from "../../../archive-manifest.json";
import cadenciaJson from "../../../data/cadencia.json";
import coparticipacionJson from "../../../data/coparticipacion.json";
import fallosJson from "../../../data/fallos.json";
import gastoPartidaJson from "../../../data/gasto-partida.json";
import transparenciaJson from "../../../data/transparencia.json";
import {
  cadenciaDataSchema,
  coparticipacionDataSchema,
  fallosDataSchema,
  gastoPartidaDataSchema,
  manifestSchema,
  transparenciaDataSchema,
  type CadenciaData,
  type CoparticipacionData,
  type FallosData,
  type GastoPartidaData,
  type Manifest,
  type TransparenciaData,
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

export function loadTransparencia(
  raw: unknown = transparenciaJson,
): TransparenciaData {
  return transparenciaDataSchema.parse(raw);
}

export function loadCadencia(raw: unknown = cadenciaJson): CadenciaData {
  return cadenciaDataSchema.parse(raw);
}

export function loadGastoPartida(
  raw: unknown = gastoPartidaJson,
): GastoPartidaData {
  return gastoPartidaDataSchema.parse(raw);
}
