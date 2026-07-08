"use client";

import { useId, useMemo, useState } from "react";
import {
  executionFraction,
  filterGastoPartidaTree,
  type FilteredObjeto,
  type FilteredPrograma,
} from "@/lib/gastoPartida";
import { formatArsHuman, formatArsPlain } from "@/lib/format";
import type { GastoPartidaJurisdiccion } from "@/lib/schemas";

/**
 * The G2 "gasto por partida" explorer's ONLY client island: a searchable,
 * expandable Jurisdicción -> Programa -> Objeto tree. Everything static
 * (intro copy, honesty caveat, provenance) stays in the server-rendered
 * `app/gastos/page.tsx` -- this component receives the full (already
 * build-time-validated) tree as a plain prop, never fetches anything
 * itself (DESIGN.md INVIOLABLE #4).
 *
 * Collapsed by default at every level to keep the initial DOM small even
 * though the full ~1200-leaf dataset is already in memory (conditional
 * rendering: an unexpanded branch's children are not mounted at all, not
 * just visually hidden). A non-empty search query auto-expands every
 * matching branch so results are visible without extra taps.
 *
 * "% ejecutado" is rendered in plain neutral ink -- NEVER `--olive`/`--stamp`
 * -- because it is a ratio within a single reporting period, not an
 * arithmetic variation of the same series over time (DESIGN.md's chromatic
 * neutrality rule; same precedent as `TransparenciaGauge`'s absolute score
 * ring). An objeto whose row failed the parser's own arithmetic
 * self-check (`verified: false`, expected to be rare -- 0/1179 in the real
 * data at apply-time) gets the `--ocre` "resalta, no juzga" documentary
 * token, same as the fallos "documento escaneado" badge -- never hidden,
 * never silently trusted.
 */
export function GastoPartidaExplorer({
  jurisdicciones,
}: {
  jurisdicciones: GastoPartidaJurisdiccion[];
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchInputId = useId();

  const filtered = useMemo(
    () => filterGastoPartidaTree(jurisdicciones, query),
    [jurisdicciones, query],
  );
  const isSearching = query.trim().length > 0;

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-5">
        <label
          htmlFor={searchInputId}
          className="block font-mono text-xs tracking-[0.1em] text-muted uppercase"
        >
          Buscar partida por nombre o código
        </label>
        <input
          id={searchInputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: combustible, sueldos, 1.1.1.0…"
          className="mt-1.5 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 py-2 text-[15px] text-ink shadow-control focus-visible:outline-2 focus-visible:outline-stamp"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-2" role="status">
          No encontramos ninguna partida para «{query}». Probá con otra
          palabra o con el código de la partida.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((jurisdiccion) => {
            const key = `jurisdiccion:${jurisdiccion.code}`;
            const isOpen = isSearching || expanded.has(key);
            const panelId = `${searchInputId}-${key}`;
            return (
              <li
                key={jurisdiccion.code}
                className="rounded-lg border border-rule bg-surface shadow-card"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(key)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left no-underline"
                >
                  <span>
                    <span className="font-sans font-semibold text-ink">
                      {jurisdiccion.name}
                    </span>{" "}
                    <span className="font-mono text-xs text-muted">
                      {jurisdiccion.code}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-sm text-muted"
                  >
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen ? (
                  <div id={panelId} className="border-t border-rule px-4 py-3">
                    <ProgramaList
                      programas={jurisdiccion.programas}
                      jurisdiccionCode={jurisdiccion.code}
                      isSearching={isSearching}
                      expanded={expanded}
                      onToggle={toggle}
                      searchInputId={searchInputId}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProgramaList({
  programas,
  jurisdiccionCode,
  isSearching,
  expanded,
  onToggle,
  searchInputId,
}: {
  programas: FilteredPrograma[];
  jurisdiccionCode: string;
  isSearching: boolean;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  searchInputId: string;
}) {
  return (
    <ul className="space-y-2">
      {programas.map((programa) => {
        const key = `programa:${jurisdiccionCode}:${programa.code}`;
        const isOpen = isSearching || expanded.has(key);
        const panelId = `${searchInputId}-${key}`;
        return (
          <li key={programa.code}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onToggle(key)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm bg-surface-2 px-3 py-2.5 text-left no-underline"
            >
              <span>
                <span className="text-[15px] text-ink">{programa.name}</span>{" "}
                <span className="font-mono text-xs text-muted">
                  {programa.code}
                </span>
              </span>
              <span aria-hidden="true" className="font-mono text-sm text-muted">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>
            {isOpen ? (
              <ul id={panelId} className="mt-2 space-y-2 pl-2">
                {programa.objetos.map((objeto) => (
                  <ObjetoRow key={objeto.code} objeto={objeto} />
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ObjetoRow({ objeto }: { objeto: FilteredObjeto }) {
  const fraction = executionFraction(objeto);

  return (
    <li className="rounded-sm border border-rule-soft bg-paper p-3">
      <p>
        <span className="text-[15px] text-ink">{objeto.name}</span>{" "}
        <span className="font-mono text-xs text-muted">{objeto.code}</span>
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-2 font-mono text-[13px] tabular-nums">
        <div>
          <dt className="text-[11px] text-muted uppercase">Vigente</dt>
          <dd title={formatArsPlain(objeto.vigenteArs)} className="text-ink">
            {formatArsHuman(objeto.vigenteArs)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted uppercase">Devengado</dt>
          <dd title={formatArsPlain(objeto.devengadoArs)} className="text-ink">
            {formatArsHuman(objeto.devengadoArs)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted uppercase">Pagado</dt>
          <dd title={formatArsPlain(objeto.pagadoArs)} className="text-ink">
            {formatArsHuman(objeto.pagadoArs)}
          </dd>
        </div>
      </dl>
      {fraction !== null ? (
        <p className="mt-1.5 font-mono text-xs text-ink-2 tabular-nums">
          {Math.round(fraction * 100)}% ejecutado
        </p>
      ) : null}
      {!objeto.verified ? (
        <p className="mt-1.5 inline-block rounded-sm border-l-[3px] border-ocre bg-ocre-soft px-2 py-1 text-xs text-ink-2">
          Dato no verificado: no pudimos confirmar la aritmética de esta fila
          contra el propio documento. Mostrado igual, nunca ocultado.
        </p>
      ) : null}
    </li>
  );
}
