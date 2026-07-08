import manifestJson from "../../../archive-manifest.json";
import adjudicacionesJson from "../../../data/adjudicaciones.json";
import cadenciaJson from "../../../data/cadencia.json";
import coparticipacionJson from "../../../data/coparticipacion.json";
import deudaHistoricaJson from "../../../data/deuda-historica.json";
import fallosJson from "../../../data/fallos.json";
import gastoPartidaJson from "../../../data/gasto-partida.json";
import novedadesJson from "../../../data/novedades.json";
import pedidosJson from "../../../data/pedidos.json";
import poblacionCensoJson from "../../../data/poblacion-censo-2022.json";
import proveedoresJson from "../../../data/proveedores.json";
import transparenciaJson from "../../../data/transparencia.json";
import {
  adjudicacionesDataSchema,
  cadenciaDataSchema,
  coparticipacionDataSchema,
  deudaHistoricaDataSchema,
  fallosDataSchema,
  gastoPartidaDataSchema,
  manifestSchema,
  novedadesDataSchema,
  pedidosDataSchema,
  poblacionCensoDataSchema,
  proveedoresDataSchema,
  transparenciaDataSchema,
  type AdjudicacionesData,
  type CadenciaData,
  type CoparticipacionData,
  type DeudaHistoricaData,
  type FallosData,
  type GastoPartidaData,
  type Manifest,
  type NovedadesData,
  type PedidosData,
  type PoblacionCensoData,
  type ProveedoresData,
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

export function loadAdjudicaciones(
  raw: unknown = adjudicacionesJson,
): AdjudicacionesData {
  return adjudicacionesDataSchema.parse(raw);
}

export function loadProveedores(
  raw: unknown = proveedoresJson,
): ProveedoresData {
  return proveedoresDataSchema.parse(raw);
}

export function loadPedidos(raw: unknown = pedidosJson): PedidosData {
  return pedidosDataSchema.parse(raw);
}

export function loadDeudaHistorica(
  raw: unknown = deudaHistoricaJson,
): DeudaHistoricaData {
  return deudaHistoricaDataSchema.parse(raw);
}

export function loadNovedades(raw: unknown = novedadesJson): NovedadesData {
  return novedadesDataSchema.parse(raw);
}

export function loadPoblacionCenso2022(
  raw: unknown = poblacionCensoJson,
): PoblacionCensoData {
  return poblacionCensoDataSchema.parse(raw);
}
