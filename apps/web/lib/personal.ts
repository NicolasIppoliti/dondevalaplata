import type { GastoPartidaJurisdiccion, GastoPartidaObjeto } from "./schemas";

/**
 * Pure re-aggregation helpers for "¿Cuánto se va en sueldos?": sums every
 * objeto del gasto whose "clasificador por objeto del gasto" PRINCIPAL
 * segment is "1" ("Gastos en Personal", e.g. "1.1.1.0 Retribuciones del
 * cargo", "1.3.0.0 Sueldo Anual Complementario") across the WHOLE
 * Jurisdicción -> Programa -> Objeto tree feature G2 already parses and
 * reconciles to the centavo (`data/gasto-partida.json`,
 * `etl/etl/gasto_partida.py`).
 *
 * Same "no new ETL artifact" decision `lib/presupuestoEjecucion.ts` already
 * made: this re-aggregates data that is ALREADY fully present and
 * reconciled, so a second parse/build step would only risk drifting out of
 * sync with G2's own honesty gate. No React here either -- pure functions,
 * unit-tested directly (`components/personal/PersonalSection.tsx` is the
 * only consumer).
 *
 * Classification is CODE-based, never name-based: matching text like
 * "sueldo" against `objeto.name` would silently miss/include rows depending
 * on wording (e.g. "Retribuciones del cargo" never contains "sueldo" but IS
 * personnel spend; a "Servicios" line could mention "personal de limpieza"
 * without being a personnel object). The objeto `code`'s PRINCIPAL segment
 * (everything before the first ".") is the actual RAFAM classifier digit --
 * "1" is reserved for "Gastos en Personal" across the whole tree, so
 * comparing that segment is the only reliable classification.
 */

export interface PersonalTotals {
  vigenteArs: number;
  devengadoArs: number;
  pagadoArs: number;
}

const PERSONAL_OBJETO_PRINCIPAL = "1";

/** True only for an objeto whose classifier PRINCIPAL segment is "1" (Gastos en Personal). */
export function isPersonalObjeto(objeto: Pick<GastoPartidaObjeto, "code">): boolean {
  return objeto.code.split(".")[0] === PERSONAL_OBJETO_PRINCIPAL;
}

function sumTotals(objetos: PersonalTotals[]): PersonalTotals {
  return objetos.reduce(
    (acc, objeto) => ({
      vigenteArs: acc.vigenteArs + objeto.vigenteArs,
      devengadoArs: acc.devengadoArs + objeto.devengadoArs,
      pagadoArs: acc.pagadoArs + objeto.pagadoArs,
    }),
    { vigenteArs: 0, devengadoArs: 0, pagadoArs: 0 },
  );
}

/**
 * Sums vigente/devengado/pagado of ONLY code "1.*" objetos across EVERY
 * jurisdicción and programa -- the headline "Gastos en Personal" total.
 * Never mutates `jurisdicciones`.
 */
export function personalTotals(
  jurisdicciones: GastoPartidaJurisdiccion[],
): PersonalTotals {
  const personalObjetos = jurisdicciones
    .flatMap((jurisdiccion) => jurisdiccion.programas)
    .flatMap((programa) => programa.objetos)
    .filter(isPersonalObjeto);
  return sumTotals(personalObjetos);
}

export interface AreaPersonal {
  code: string;
  name: string;
  vigenteArs: number;
  devengadoArs: number;
  pagadoArs: number;
}

/**
 * One row per Jurisdicción (área/secretaría) -- the top level of the G2
 * tree, same "por área" framing `lib/presupuestoEjecucion.ts`'s
 * `buildAreaEjecucion` already uses. An área with NO code "1.*" objeto at
 * all (e.g. "Servicios de la Deuda") still gets a row with zero totals --
 * never dropped, same "never hide an área" precedent as H1.
 */
export function personalByArea(
  jurisdicciones: GastoPartidaJurisdiccion[],
): AreaPersonal[] {
  return jurisdicciones.map((jurisdiccion) => {
    const personalObjetos = jurisdiccion.programas
      .flatMap((programa) => programa.objetos)
      .filter(isPersonalObjeto);
    return {
      code: jurisdiccion.code,
      name: jurisdiccion.name,
      ...sumTotals(personalObjetos),
    };
  });
}

/** Descending by personal devengado -- the área that spends most on personnel leads. Never mutates `areas`. */
export function sortByDevengadoDesc(areas: AreaPersonal[]): AreaPersonal[] {
  return [...areas].sort((a, b) => b.devengadoArs - a.devengadoArs);
}

/**
 * Devengado en personal / Devengado TOTAL (every objeto, not just
 * personnel), as a fraction. Returns `null` (never `NaN`/`Infinity`) when
 * total devengado is 0. Both figures must come from the SAME reporting
 * period so the ratio is meaningful -- callers pass
 * `gastoPartida.reconciliation.totalDevengadoArs` as the denominator, the
 * same reconciled grand total G2's own build-time honesty gate already
 * verified.
 */
export function personalShareOfTotal(
  personalDevengadoArs: number,
  totalDevengadoArs: number,
): number | null {
  if (totalDevengadoArs === 0) return null;
  return personalDevengadoArs / totalDevengadoArs;
}
