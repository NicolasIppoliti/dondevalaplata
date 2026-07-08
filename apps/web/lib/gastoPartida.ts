import type {
  GastoPartidaJurisdiccion,
  GastoPartidaObjeto,
  GastoPartidaPrograma,
} from "./schemas";

/**
 * Pure helpers for the "gasto por partida" explorer (feature G2): totals
 * roll-up, execution percentage, and free-text search/filter over the
 * Jurisdicción -> Programa -> Objeto tree from `data/gasto-partida.json`.
 * No React here -- these are unit-tested directly, independent of any
 * rendering concern (`components/gasto-partida/GastoPartidaExplorer.tsx`
 * is the only consumer).
 */

export interface GastoPartidaTotals {
  vigenteArs: number;
  devengadoArs: number;
  pagadoArs: number;
}

function sumTotals(items: GastoPartidaTotals[]): GastoPartidaTotals {
  return items.reduce(
    (acc, item) => ({
      vigenteArs: acc.vigenteArs + item.vigenteArs,
      devengadoArs: acc.devengadoArs + item.devengadoArs,
      pagadoArs: acc.pagadoArs + item.pagadoArs,
    }),
    { vigenteArs: 0, devengadoArs: 0, pagadoArs: 0 },
  );
}

export function programaTotals(programa: GastoPartidaPrograma): GastoPartidaTotals {
  return sumTotals(programa.objetos);
}

export function jurisdiccionTotals(
  jurisdiccion: GastoPartidaJurisdiccion,
): GastoPartidaTotals {
  return sumTotals(jurisdiccion.programas.map(programaTotals));
}

/**
 * Devengado / Vigente, as a fraction. Returns `null` (never `Infinity`/`NaN`)
 * when Vigente is 0 -- a partida with no current budget at all, where a "%
 * ejecutado" would be meaningless. NEVER clamped to [0,1]: a later negative
 * `Modificaciones` can legitimately shrink Vigente below what was already
 * devengado, and reporting that honestly (>100%) matters more than a tidy
 * bar. Callers render this NEUTRAL (never `--olive`/`--stamp`) -- it is a
 * ratio within ONE period, not an arithmetic variation of the same series
 * over time, so DESIGN.md's chromatic-neutrality rule forbids coloring it
 * (same precedent as `TransparenciaGauge`'s absolute score ring).
 */
export function executionFraction(objeto: {
  vigenteArs: number;
  devengadoArs: number;
}): number | null {
  if (objeto.vigenteArs === 0) return null;
  return objeto.devengadoArs / objeto.vigenteArs;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesQuery(query: string, ...texts: string[]): boolean {
  if (!query.trim()) return true;
  const normalizedQuery = normalizeSearchText(query);
  return texts.some((text) => normalizeSearchText(text).includes(normalizedQuery));
}

export interface FilteredObjeto extends GastoPartidaObjeto {
  matched: boolean;
}

export interface FilteredPrograma {
  code: string;
  name: string;
  totals: GastoPartidaTotals;
  objetos: FilteredObjeto[];
  matched: boolean;
}

export interface FilteredJurisdiccion {
  code: string;
  name: string;
  totals: GastoPartidaTotals;
  programas: FilteredPrograma[];
  matched: boolean;
}

/**
 * Filters the tree by a free-text query against every level's código/name,
 * accent- and case-insensitive. A branch is kept if it matches directly OR
 * any descendant matches, so a hit on a deep objeto is never hidden by an
 * unmatched ancestor -- and once a jurisdicción/programa itself matches,
 * EVERY descendant stays visible (searching "Hacienda" shows the whole
 * jurisdicción, not just objetos literally named "Hacienda"). An empty
 * query returns the full tree, every node marked `matched: true`. Never
 * mutates the input.
 */
export function filterGastoPartidaTree(
  jurisdicciones: GastoPartidaJurisdiccion[],
  query: string,
): FilteredJurisdiccion[] {
  const result: FilteredJurisdiccion[] = [];

  for (const jurisdiccion of jurisdicciones) {
    const jurisdiccionMatched = matchesQuery(query, jurisdiccion.code, jurisdiccion.name);
    const programas: FilteredPrograma[] = [];

    for (const programa of jurisdiccion.programas) {
      const programaMatched =
        jurisdiccionMatched || matchesQuery(query, programa.code, programa.name);
      const objetos: FilteredObjeto[] = [];

      for (const objeto of programa.objetos) {
        const objetoMatched =
          programaMatched || matchesQuery(query, objeto.code, objeto.name);
        if (objetoMatched) objetos.push({ ...objeto, matched: true });
      }

      if (objetos.length > 0) {
        programas.push({
          code: programa.code,
          name: programa.name,
          totals: programaTotals(programa),
          objetos,
          matched: programaMatched,
        });
      }
    }

    if (programas.length > 0) {
      result.push({
        code: jurisdiccion.code,
        name: jurisdiccion.name,
        totals: jurisdiccionTotals(jurisdiccion),
        programas,
        matched: jurisdiccionMatched,
      });
    }
  }

  return result;
}
