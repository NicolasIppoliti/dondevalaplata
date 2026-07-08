"use client";

import { Fragment, useId, useMemo, useState } from "react";
import {
  filterAdjudicaciones,
  filterProveedores,
  sortAdjudicaciones,
  sortProveedores,
  type AdjudicacionSortKey,
  type ProveedorSortKey,
  type SortDirection,
} from "@/lib/adjudicaciones";
import {
  formatArsHuman,
  formatArsPlain,
  formatDateEsAr,
  formatDateShortEsAr,
} from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { AdjudicacionRecord, ProveedorRecord } from "@/lib/schemas";

type AdjudicacionWithSource = AdjudicacionRecord & { sourceLink: SourceLink };

/**
 * The G3 SIBOM adjudicaciones monitor's ONLY client island: a searchable,
 * sortable, expandable table of adjudicaciones plus a "padrón de
 * proveedores" (reconstructed vendor aggregate) view, switched via tabs
 * sharing this one component's state. Everything static (intro copy, honest
 * scope caveat, legal citations) stays in the server-rendered
 * `app/adjudicaciones/page.tsx` -- this component receives the already
 * build-time-validated rows as plain props (each adjudicación row
 * pre-resolved to its own `SourceLink`, see the page), never fetches
 * anything itself (DESIGN.md INVIOLABLE #4).
 *
 * STRICTLY FACTUAL framing throughout: no color/weight is ever used to
 * "judge" a vendor or a decreto (DESIGN.md's chromatic-neutrality rule) --
 * vendor names and amounts are neutral public facts, presented identically
 * regardless of size. Clicking a proveedor in the padrón view switches back
 * to the adjudicaciones tab with the search query set to that vendor's
 * exact name, so its own sourced decreto rows are one tap away -- the
 * padrón itself never re-states per-row provenance (that lives only on the
 * adjudicaciones rows, avoiding two competing copies of the same sha256).
 */
export function AdjudicacionesExplorer({
  records,
  proveedores,
}: {
  records: AdjudicacionWithSource[];
  proveedores: ProveedorRecord[];
}) {
  const [tab, setTab] = useState<"adjudicaciones" | "proveedores">(
    "adjudicaciones",
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adjSort, setAdjSort] = useState<{
    key: AdjudicacionSortKey;
    direction: SortDirection;
  }>({ key: "fecha", direction: "desc" });
  const [provSort, setProvSort] = useState<{
    key: ProveedorSortKey;
    direction: SortDirection;
  }>({ key: "totalArs", direction: "desc" });

  const searchId = useId();
  const adjPanelId = useId();
  const provPanelId = useId();

  const visibleRecords = useMemo(() => {
    const filtered = filterAdjudicaciones(records, query);
    return sortAdjudicaciones(filtered, adjSort.key, adjSort.direction);
  }, [records, query, adjSort]);

  const visibleProveedores = useMemo(() => {
    const filtered = filterProveedores(proveedores, query);
    return sortProveedores(filtered, provSort.key, provSort.direction);
  }, [proveedores, query, provSort]);

  function toggleAdjSort(key: AdjudicacionSortKey) {
    setAdjSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  function toggleProvSort(key: ProveedorSortKey) {
    setProvSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  function toggleExpanded(sourceRef: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sourceRef)) {
        next.delete(sourceRef);
      } else {
        next.add(sourceRef);
      }
      return next;
    });
  }

  function goToProveedor(proveedor: string) {
    setTab("adjudicaciones");
    setQuery(proveedor);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Vista"
        className="flex gap-2 border-b border-rule"
      >
        <button
          type="button"
          role="tab"
          id={`${searchId}-tab-adj`}
          aria-selected={tab === "adjudicaciones"}
          aria-controls={adjPanelId}
          onClick={() => setTab("adjudicaciones")}
          className={`min-h-11 border-b-2 px-3 py-2 text-[15px] no-underline ${
            tab === "adjudicaciones"
              ? "border-stamp font-semibold text-stamp"
              : "border-transparent text-ink-2"
          }`}
        >
          Adjudicaciones
        </button>
        <button
          type="button"
          role="tab"
          id={`${searchId}-tab-prov`}
          aria-selected={tab === "proveedores"}
          aria-controls={provPanelId}
          onClick={() => setTab("proveedores")}
          className={`min-h-11 border-b-2 px-3 py-2 text-[15px] no-underline ${
            tab === "proveedores"
              ? "border-stamp font-semibold text-stamp"
              : "border-transparent text-ink-2"
          }`}
        >
          Padrón de proveedores
        </button>
      </div>

      <div className="mt-5 mb-5">
        <label
          htmlFor={searchId}
          className="block font-mono text-xs tracking-[0.1em] text-muted uppercase"
        >
          Buscar por proveedor, decreto, expediente u objeto
        </label>
        <input
          id={searchId}
          type="search"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: Sedarri, 524/2023, hotelería…"
          className="mt-1.5 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 py-2 text-[15px] text-ink shadow-control focus-visible:outline-2 focus-visible:outline-stamp"
        />
      </div>

      <div
        role="tabpanel"
        id={adjPanelId}
        aria-labelledby={`${searchId}-tab-adj`}
        hidden={tab !== "adjudicaciones"}
      >
        {tab === "adjudicaciones" ? (
          <AdjudicacionesTable
            records={visibleRecords}
            sort={adjSort}
            onSort={toggleAdjSort}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            query={query}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={provPanelId}
        aria-labelledby={`${searchId}-tab-prov`}
        hidden={tab !== "proveedores"}
      >
        {tab === "proveedores" ? (
          <ProveedoresPadron
            proveedores={visibleProveedores}
            sort={provSort}
            onSort={toggleProvSort}
            query={query}
            onSelectProveedor={goToProveedor}
          />
        ) : null}
      </div>
    </div>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: React.ReactNode;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1 no-underline"
    >
      {label}
      <span aria-hidden="true" className="font-mono text-xs text-muted">
        {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

function AdjudicacionesTable({
  records,
  sort,
  onSort,
  expanded,
  onToggleExpanded,
  query,
}: {
  records: AdjudicacionWithSource[];
  sort: { key: AdjudicacionSortKey; direction: SortDirection };
  onSort: (key: AdjudicacionSortKey) => void;
  expanded: Set<string>;
  onToggleExpanded: (sourceRef: string) => void;
  query: string;
}) {
  if (records.length === 0) {
    return (
      <p className="text-ink-2" role="status">
        No encontramos ninguna adjudicación para «{query}». Probá con otro
        proveedor, número de decreto o palabra clave.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        <caption className="sr-only">
          Adjudicaciones publicadas por el municipio en su Boletín Oficial
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th
              scope="col"
              className="py-2 pr-3"
              aria-sort={
                sort.key === "fecha"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortButton
                label="Fecha"
                active={sort.key === "fecha"}
                direction={sort.direction}
                onClick={() => onSort("fecha")}
              />
            </th>
            <th
              scope="col"
              className="py-2 pr-3"
              aria-sort={
                sort.key === "proveedor"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortButton
                label="Proveedor"
                active={sort.key === "proveedor"}
                direction={sort.direction}
                onClick={() => onSort("proveedor")}
              />
            </th>
            <th
              scope="col"
              className="py-2 pr-3 text-right"
              aria-sort={
                sort.key === "montoArs"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortButton
                label="Monto"
                active={sort.key === "montoArs"}
                direction={sort.direction}
                onClick={() => onSort("montoArs")}
              />
            </th>
            <th scope="col" className="hidden py-2 pr-3 sm:table-cell">
              Decreto
            </th>
            <th scope="col" className="py-2">
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const isOpen = expanded.has(record.sourceRef);
            const detailId = `detalle-${record.sourceRef}`;
            return (
              <Fragment key={record.sourceRef}>
                <tr className="border-b border-rule">
                  <td className="py-2.5 pr-2 font-mono text-[13px] tabular-nums text-ink-2 sm:pr-3">
                    {formatDateShortEsAr(record.fecha)}
                  </td>
                  <td className="py-2.5 pr-2 text-ink sm:pr-3">
                    {record.proveedor}
                  </td>
                  <td
                    className="py-2.5 pr-2 text-right font-mono tabular-nums text-ink sm:pr-3"
                    title={formatArsPlain(record.montoArs)}
                  >
                    {formatArsHuman(record.montoArs)}
                  </td>
                  <td className="hidden py-2.5 pr-3 font-mono text-[13px] text-muted sm:table-cell">
                    {record.decreto}
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      onClick={() => onToggleExpanded(record.sourceRef)}
                      className="min-h-11 min-w-11 no-underline"
                    >
                      <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                      <span className="sr-only">
                        Ver detalle de {record.proveedor}
                      </span>
                    </button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td
                      colSpan={5}
                      id={detailId}
                      className="bg-surface-2 px-3 py-4"
                    >
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 font-mono text-[13px] sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] text-muted uppercase">
                            Decreto
                          </dt>
                          <dd className="text-ink">
                            Decreto Nº {record.decreto} (
                            {formatDateEsAr(record.fecha)})
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted uppercase">
                            Expediente
                          </dt>
                          <dd className="break-all text-ink">
                            {record.expediente ??
                              "no especificado en el decreto"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted uppercase">
                            Procedimiento
                          </dt>
                          <dd className="break-all text-ink">
                            {record.procedimiento ??
                              "no especificado en el decreto"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted uppercase">
                            Boletín Oficial
                          </dt>
                          <dd className="text-ink">
                            Nº {record.bulletinNumber}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 max-w-[70ch] font-sans text-[14px] text-ink-2">
                        {record.objeto}
                      </p>
                      <p className="mt-3 flex flex-wrap gap-x-2 font-mono text-[11.5px] break-all text-muted">
                        <a
                          href={record.sourceLink.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Fuente original
                          <span className="sr-only">
                            {" "}
                            (se abre en una pestaña nueva)
                          </span>
                        </a>
                        <span aria-hidden="true">·</span>
                        {record.sourceLink.archivedUrl ? (
                          <a
                            href={record.sourceLink.archivedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Copia archivada
                            <span className="sr-only">
                              {" "}
                              (se abre en una pestaña nueva)
                            </span>
                          </a>
                        ) : (
                          <span>copia archivada no disponible</span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          sha256 {shortHash(record.sourceLink.sha256)}
                        </span>
                      </p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProveedoresPadron({
  proveedores,
  sort,
  onSort,
  query,
  onSelectProveedor,
}: {
  proveedores: ProveedorRecord[];
  sort: { key: ProveedorSortKey; direction: SortDirection };
  onSort: (key: ProveedorSortKey) => void;
  query: string;
  onSelectProveedor: (proveedor: string) => void;
}) {
  return (
    <div>
      <p className="max-w-[70ch] text-sm text-ink-2">
        Este padrón está reconstruido a partir del Boletín Oficial: el padrón
        oficial de proveedores de la Municipalidad está detrás de un login, pese
        a que la Ordenanza 3638 (Art. 11) exige que sea público. Estos totales
        suman solo lo que pasó por licitación, concurso o decreto y que el
        municipio publicó — nunca el gasto total con cada proveedor.
      </p>

      {proveedores.length === 0 ? (
        <p className="mt-4 text-ink-2" role="status">
          No encontramos ningún proveedor para «{query}».
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full border-collapse text-left text-[14px]">
            <caption className="sr-only">
              Padrón de proveedores reconstruido a partir de las adjudicaciones
            </caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="py-2 pr-3">
                  <SortButton
                    label="Proveedor"
                    active={sort.key === "proveedor"}
                    direction={sort.direction}
                    onClick={() => onSort("proveedor")}
                  />
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  <SortButton
                    label="Total adjudicado"
                    active={sort.key === "totalArs"}
                    direction={sort.direction}
                    onClick={() => onSort("totalArs")}
                  />
                </th>
                <th scope="col" className="py-2 text-right">
                  <SortButton
                    label={
                      <>
                        <span aria-hidden="true">
                          Nº
                          <span className="hidden sm:inline">
                            {" "}
                            de adjudicaciones
                          </span>
                        </span>
                        <span className="sr-only">
                          Número de adjudicaciones
                        </span>
                      </>
                    }
                    active={sort.key === "count"}
                    direction={sort.direction}
                    onClick={() => onSort("count")}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((proveedor) => (
                <tr key={proveedor.proveedor} className="border-b border-rule">
                  <td className="py-2.5 pr-3 text-ink">
                    <button
                      type="button"
                      onClick={() => onSelectProveedor(proveedor.proveedor)}
                      className="min-h-11 text-left"
                    >
                      {proveedor.proveedor}
                      <span className="sr-only">
                        {" "}
                        — ver adjudicaciones de {proveedor.proveedor}
                      </span>
                    </button>
                  </td>
                  <td
                    className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink"
                    title={formatArsPlain(proveedor.totalArs)}
                  >
                    {formatArsHuman(proveedor.totalArs)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink">
                    {proveedor.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
