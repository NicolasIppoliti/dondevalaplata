import type { PedidoRecord } from "./schemas";

/**
 * Pure business-day math for the Ordenanza 3638 (Coronel Rosales) Art. 8
 * plazo: 30 días hábiles for the Departamento Ejecutivo/HCD to answer a
 * pedido de acceso a la información. No React, no `Date.now()` at module
 * load -- every function takes its "today" as an explicit ISO argument so
 * callers control exactly when "now" is read (see
 * `components/pedidos/PedidosTracker.tsx`, which reads it client-side,
 * post-mount, precisely so a statically-prerendered page never bakes a
 * stale build-time date into the HTML).
 */
export const PLAZO_HABIL_DIAS = 30;

function parseIsoDateUTC(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Counts business days (Monday-Friday) strictly AFTER `fromISO` up to and
 * including `toISO`. Returns `0` when `toISO` is on or before `fromISO`.
 *
 * HONEST LIMITATION (surfaced in the UI, never hidden): this excludes
 * weekends only -- it does NOT subtract national/provincial feriados,
 * since this portal has no verified/archived holiday calendar to cite.
 * That means the real "días hábiles" Ordenanza 3638 counts is always
 * `<=` what this function reports, never the other way around: a pedido
 * this function marks overdue is never incorrectly cleared, it can only
 * look overdue a few calendar days earlier than a feriado-aware count
 * would.
 */
export function countBusinessDaysBetween(fromISO: string, toISO: string): number {
  const from = parseIsoDateUTC(fromISO);
  const to = parseIsoDateUTC(toISO);
  if (to.getTime() <= from.getTime()) return 0;

  let count = 0;
  const cursor = new Date(from.getTime());
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor.getTime() <= to.getTime()) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export interface PlazoStatus {
  businessDaysElapsed: number;
  /** Negative once `isOverdue` is true. */
  businessDaysRemaining: number;
  isOverdue: boolean;
  deadlineDays: number;
  /** `true` when the pedido was already answered -- the count is frozen at
   * `fechaRespuesta` and no longer advances with the reference date. */
  frozen: boolean;
}

/**
 * Computes the Art. 8 plazo status for a single pedido. For a `"respondido"`
 * pedido with a `fechaRespuesta`, the count freezes there (a pedido that
 * already got its answer doesn't keep accumulating "days without
 * response"); otherwise it runs up to `referenceISO` (the caller's "today").
 */
export function computePlazoStatus(
  pedido: Pick<PedidoRecord, "fechaPresentado" | "estado" | "fechaRespuesta">,
  referenceISO: string,
): PlazoStatus {
  const frozen = pedido.estado === "respondido" && Boolean(pedido.fechaRespuesta);
  const upToISO = frozen ? pedido.fechaRespuesta! : referenceISO;
  const businessDaysElapsed = countBusinessDaysBetween(pedido.fechaPresentado, upToISO);

  return {
    businessDaysElapsed,
    businessDaysRemaining: PLAZO_HABIL_DIAS - businessDaysElapsed,
    isOverdue: businessDaysElapsed > PLAZO_HABIL_DIAS,
    deadlineDays: PLAZO_HABIL_DIAS,
    frozen,
  };
}

export interface PedidosSummary {
  total: number;
  respondedCount: number;
  overdueCount: number;
  pendingCount: number;
}

/**
 * Aggregate counts for the home-dashboard preview row and the /pedidos
 * page intro. A pedido counts as `respondedCount` regardless of how long
 * it took (that historical fact doesn't change); everything else is
 * `overdueCount` or `pendingCount` based on the LIVE computed plazo, not
 * the manually-set `estado` value -- so a pedido still stored as
 * `"presentado"` that has quietly crossed 30 días hábiles is correctly
 * counted as overdue without requiring the owner to remember to flip it
 * to `"vencido"` by hand.
 */
export function summarizePedidos(
  pedidos: PedidoRecord[],
  referenceISO: string,
): PedidosSummary {
  let respondedCount = 0;
  let overdueCount = 0;
  let pendingCount = 0;

  for (const pedido of pedidos) {
    if (pedido.estado === "respondido") {
      respondedCount++;
      continue;
    }
    const status = computePlazoStatus(pedido, referenceISO);
    if (status.isOverdue) {
      overdueCount++;
    } else {
      pendingCount++;
    }
  }

  return { total: pedidos.length, respondedCount, overdueCount, pendingCount };
}
