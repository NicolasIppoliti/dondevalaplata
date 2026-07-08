import type { GastoPartidaJurisdiccion } from "./schemas";
import { executionFraction, jurisdiccionTotals } from "./gastoPartida";

/**
 * Feature H1: "¿Cumplen lo que prometieron?" -- Presupuesto vs. Ejecución
 * por área. Pure re-aggregation helpers over the SAME Jurisdicción ->
 * Programa -> Objeto tree feature G2 already parses from the real RAFAM
 * PDF and reconciles to the centavo (`data/gasto-partida.json`,
 * `etl/etl/gasto_partida.py`) -- this module introduces NO new ETL output,
 * NO new archived source, and no new build-time JSON file: every peso here
 * is already inside G2's own reconciled dataset, this only re-groups it
 * one level up, from the leaf Objeto del Gasto to the top-level
 * Jurisdicción (the "área"/secretaría the task asks to compare).
 *
 * Decision (the task offered a choice: a new `data/presupuesto-
 * ejecucion.json` ETL artifact, or a small tested lib fn from the existing
 * one): a lib fn wins here, same reasoning already applied by
 * `lib/gastoPartida.ts`'s `jurisdiccionTotals`/`programaTotals` -- a plain
 * re-aggregation of data that is ALREADY fully present and already
 * reconciled needs no second parse/fetch/build step to keep in sync. No
 * React here either: pure functions, unit-tested directly, independent of
 * any rendering concern (`components/presupuesto-ejecucion/
 * PresupuestoEjecucionSection.tsx` is the only consumer).
 */

export interface AreaEjecucion {
  code: string;
  name: string;
  vigenteArs: number;
  devengadoArs: number;
  /**
   * Devengado / Vigente for the WHOLE área. `null` (never NaN/Infinity)
   * when the área's total Vigente is 0. NEVER clamped to 1 -- an área can
   * legitimately execute beyond its current (already-adjusted) budget,
   * and reporting that honestly is the entire point of this feature (same
   * precedent as G2's own `executionFraction`).
   */
  executionFraction: number | null;
  /**
   * Devengado - Vigente, in pesos. Positive means the área executed BEYOND
   * its current budget by that many pesos; negative means that many pesos
   * of the current budget are still unexecuted.
   */
  gapArs: number;
}

/**
 * One row per Jurisdicción (área/secretaría) -- the top level of the G2
 * tree, matching feature H1's "por área" framing. Reuses G2's own
 * `jurisdiccionTotals`/`executionFraction` so both features can never
 * silently drift apart on how a total or a ratio is computed.
 */
export function buildAreaEjecucion(
  jurisdicciones: GastoPartidaJurisdiccion[],
): AreaEjecucion[] {
  return jurisdicciones.map((jurisdiccion) => {
    const totals = jurisdiccionTotals(jurisdiccion);
    return {
      code: jurisdiccion.code,
      name: jurisdiccion.name,
      vigenteArs: totals.vigenteArs,
      devengadoArs: totals.devengadoArs,
      executionFraction: executionFraction(totals),
      gapArs: totals.devengadoArs - totals.vigenteArs,
    };
  });
}

/**
 * Descending by % ejecutado -- the standout case (an área over 100%, if
 * any) leads the list, matching the "filoso" framing of this feature.
 * Áreas with no computable fraction (Vigente totals 0) sort last, never
 * dropped from the list.
 */
export function sortByExecutionDesc(
  areas: AreaEjecucion[],
): AreaEjecucion[] {
  return [...areas].sort((a, b) => {
    if (a.executionFraction === null && b.executionFraction === null) {
      return 0;
    }
    if (a.executionFraction === null) return 1;
    if (b.executionFraction === null) return -1;
    return b.executionFraction - a.executionFraction;
  });
}

const OVER_EXECUTION_THRESHOLD = 1;

/**
 * Áreas that executed MORE than their current (already-adjusted) Vigente
 * budget. Surfaced as a "llama la atención" documentary highlight, never
 * proof of irregularity by itself -- see the honesty caveat rendered
 * alongside this in `app/gastos/page.tsx`.
 */
export function overExecutedAreas(areas: AreaEjecucion[]): AreaEjecucion[] {
  return areas
    .filter(
      (area) =>
        area.executionFraction !== null &&
        area.executionFraction > OVER_EXECUTION_THRESHOLD,
    )
    .sort((a, b) => (b.executionFraction ?? 0) - (a.executionFraction ?? 0));
}

/**
 * The `count` área(s) with the comparatively LOWEST % ejecutado among those
 * with a computable fraction -- reported as a factual reference point
 * (never a claim of "underspending" or wrongdoing).
 */
export function leastExecutedAreas(
  areas: AreaEjecucion[],
  count = 1,
): AreaEjecucion[] {
  return [...areas]
    .filter((area) => area.executionFraction !== null)
    .sort((a, b) => (a.executionFraction ?? 0) - (b.executionFraction ?? 0))
    .slice(0, count);
}

/**
 * Sums every área's Vigente/Devengado. Used by the reconciliation test to
 * verify this re-grouping never drops or double-counts a peso already
 * reconciled by G2's own build-time honesty gate (`build_gasto_partida`) --
 * "área totals sum to the global total".
 */
export function reconcileAreaTotals(areas: AreaEjecucion[]): {
  vigenteArs: number;
  devengadoArs: number;
} {
  return areas.reduce(
    (acc, area) => ({
      vigenteArs: acc.vigenteArs + area.vigenteArs,
      devengadoArs: acc.devengadoArs + area.devengadoArs,
    }),
    { vigenteArs: 0, devengadoArs: 0 },
  );
}
