"use client";

import { useId, useMemo, useState } from "react";
import {
  computeChartLayout,
  computeMomDelta,
  computeReferenceYearAverage,
  nearestPeriodIndex,
  type ChartLayout,
  type MomDelta,
} from "@/lib/chartGeometry";
import {
  formatArsHuman,
  formatPeriodEsAr,
  formatVariationEsAr,
} from "@/lib/format";

/**
 * Formatters are imported directly (not received as props) on purpose:
 * this is a Client Component, and functions cannot cross the
 * Server->Client Component boundary (React Server Components only
 * serialize plain data across that boundary) -- a Server Component page
 * passing `formatArsHuman` etc. as props here fails at build time
 * ("Functions cannot be passed directly to Client Components"), even
 * though it renders fine under Vitest/RTL, which doesn't enforce that
 * boundary. `lib/format.ts` has no server-only imports, so importing its
 * pure functions straight into this client bundle is safe.
 */

/**
 * Hand-rolled inline-SVG interactive chart (client island) for the
 * /coparticipacion hero. No chart library -- per DESIGN.md's "no heavy
 * chart CDN" rule -- just plain SVG + pointer/keyboard event handlers, kept
 * fast on a cheap Android. Renders TWO viewBox variants (mobile portrait,
 * desktop landscape) toggled purely via CSS breakpoints, same zero-JS
 * viewport-branching pattern the static hero chart used (see DESIGN.md's
 * decision log on avoiding letterboxing) -- both share this ONE
 * component's `mode`/`activeIndex` state, so switching Real/Nominal or
 * moving the crosshair stays in sync regardless of which variant is
 * visible at the current breakpoint.
 */

export interface InteractiveCoparticipacionChartPoint {
  period: string;
  real: number;
  nominal: number;
}

type ChartMode = "real" | "nominal";

interface InteractiveCoparticipacionChartProps {
  points: InteractiveCoparticipacionChartPoint[];
  baseMonthLabel: string;
}

const MOBILE_VIEW = { width: 380, height: 460 };
const DESKTOP_VIEW = { width: 880, height: 460 };
const GRID_LINE_COUNT = 4;
// Same heuristic SvgChart uses to size the left axis-label gutter so long
// formatted values ("$ 1.750 millones") don't clip against the viewBox
// edge -- kept local since it's tied to this component's own mono
// typeface/font-size, same approach SvgChart takes for its own gutter.
const AXIS_LABEL_FONT_SIZE = 11;
const AXIS_LABEL_CHAR_WIDTH = AXIS_LABEL_FONT_SIZE * 0.62;
const AXIS_LABEL_GAP = 8;

function describeDelta(
  delta: MomDelta,
  formatVariation: (fraction: number) => string,
): string {
  if (delta.fraction === null) return "mes base de la serie";
  if (delta.direction === "flat") return "sin cambios respecto del mes anterior";
  const arrow = delta.direction === "up" ? "▲" : "▼";
  return `${arrow} ${formatVariation(delta.fraction)} respecto del mes anterior`;
}

function unitNoteFor(mode: ChartMode, baseMonthLabel: string): string {
  return mode === "real"
    ? `Montos en pesos, ajustados por inflación (base ${baseMonthLabel}).`
    : "Montos en pesos, sin ajustar por inflación (valores nominales).";
}

export function InteractiveCoparticipacionChart({
  points,
  baseMonthLabel,
}: InteractiveCoparticipacionChartProps) {
  const formatPeriod = formatPeriodEsAr;
  const formatValue = formatArsHuman;
  const formatVariation = formatVariationEsAr;
  const [mode, setMode] = useState<ChartMode>("real");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const readoutId = useId();

  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.period.localeCompare(b.period)),
    [points],
  );
  const valuePoints = useMemo(
    () =>
      sortedPoints.map((p) => ({
        period: p.period,
        value: mode === "real" ? p.real : p.nominal,
      })),
    [sortedPoints, mode],
  );
  const values = useMemo(() => valuePoints.map((p) => p.value), [valuePoints]);
  const reference = useMemo(
    () => computeReferenceYearAverage(valuePoints),
    [valuePoints],
  );

  const lastIndex = values.length - 1;
  const headlineDelta = computeMomDelta(values, lastIndex);
  const activeDelta = activeIndex !== null ? computeMomDelta(values, activeIndex) : null;
  const activePoint = activeIndex !== null ? valuePoints[activeIndex] : null;

  function moveTo(index: number) {
    const clamped = Math.max(0, Math.min(lastIndex, index));
    setActiveIndex(clamped);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = activeIndex ?? lastIndex;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        moveTo(current - 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        moveTo(current + 1);
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(lastIndex);
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  }

  function handleFocus() {
    if (activeIndex === null) setActiveIndex(lastIndex);
  }

  function pointerIndexAndPosition(
    event: React.PointerEvent<HTMLDivElement>,
    layout: ChartLayout,
    viewBoxWidth: number,
    viewBoxHeight: number,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / viewBoxWidth || 1;
    const scaleY = rect.height / viewBoxHeight || 1;
    const viewBoxX = (event.clientX - rect.left) / scaleX;
    const index = nearestPeriodIndex(layout.coords, viewBoxX);
    const coord = layout.coords[index];
    return {
      index,
      left: coord.x * scaleX,
      top: coord.y * scaleY,
    };
  }

  function readoutText(): string {
    if (activeIndex === null || !activePoint) return "";
    const delta = activeDelta ?? { direction: "flat" as const, fraction: null };
    return `${formatPeriod(activePoint.period)}: ${formatValue(activePoint.value)}. ${describeDelta(delta, formatVariation)}.`;
  }

  function renderVariant(
    variant: "mobile" | "desktop",
    view: { width: number; height: number },
    wrapClassName: string,
  ) {
    const gridLineValues = Array.from({ length: GRID_LINE_COUNT }, (_, i) => {
      const vals = values.length ? values : [0];
      const min = Math.min(...vals, 0);
      const max = Math.max(...vals, 0);
      return min + ((max - min) * i) / (GRID_LINE_COUNT - 1);
    });
    const longestLabelLength = gridLineValues.reduce(
      (max, v) => Math.max(max, formatValue(v).length),
      0,
    );
    const leftPadding = Math.max(
      16,
      Math.ceil(longestLabelLength * AXIS_LABEL_CHAR_WIDTH) + AXIS_LABEL_GAP,
    );

    const layout = computeChartLayout({
      points: valuePoints,
      viewBoxWidth: view.width,
      viewBoxHeight: view.height,
      gridLineCount: GRID_LINE_COUNT,
      padding: { top: 24, right: 20, bottom: 32, left: leftPadding },
    });

    const last = layout.coords[layout.coords.length - 1];
    const first = layout.coords[0];
    const referenceY = reference ? layout.scaleValueToY(reference.average) : null;
    const active = activeIndex !== null ? layout.coords[activeIndex] : null;

    return (
      <div className={wrapClassName} key={variant}>
        <div
          role="img"
          aria-label={`Coparticipación mensual de Coronel Rosales, en ${
            mode === "real" ? "pesos constantes" : "pesos nominales"
          }, de ${formatPeriod(first.period)} a ${formatPeriod(last.period)}. Usá las flechas del teclado para recorrer los meses.`}
          tabIndex={0}
          onFocus={handleFocus}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
          onPointerMove={(event) => {
            const { index, left, top } = pointerIndexAndPosition(
              event,
              layout,
              view.width,
              view.height,
            );
            setActiveIndex(index);
            setTooltipPos({ left, top });
          }}
          onPointerDown={(event) => {
            const { index, left, top } = pointerIndexAndPosition(
              event,
              layout,
              view.width,
              view.height,
            );
            setActiveIndex(index);
            setTooltipPos({ left, top });
          }}
          onPointerLeave={() => {
            setActiveIndex(null);
            setTooltipPos(null);
          }}
          className="relative block h-full w-full touch-pan-y outline-none"
        >
          <svg
            viewBox={`0 0 ${view.width} ${view.height}`}
            aria-hidden="true"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {layout.gridLines.map((line, i) => (
              <g key={line.value}>
                <line
                  x1={layout.padding.left}
                  y1={line.y}
                  x2={view.width - layout.padding.right}
                  y2={line.y}
                  stroke="var(--color-rule)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : "3 4"}
                />
                <text
                  x={layout.padding.left - 6}
                  y={line.y - 3}
                  textAnchor="end"
                  fontSize={AXIS_LABEL_FONT_SIZE}
                  fill="var(--color-muted)"
                  className="font-mono"
                >
                  {formatValue(line.value)}
                </text>
              </g>
            ))}

            {referenceY !== null ? (
              <g>
                <line
                  x1={layout.padding.left}
                  y1={referenceY}
                  x2={view.width - layout.padding.right}
                  y2={referenceY}
                  stroke="var(--color-muted)"
                  strokeWidth={1.4}
                  strokeDasharray="5 4"
                />
                {/* Anchored at the LEFT edge of the line (never the right):
                    the end-of-line value label always sits near the right
                    edge, so a right-anchored reference label would
                    frequently collide with it whenever the reference
                    average and the latest value are visually close on the
                    Y axis (a real occurrence in production data -- e.g.
                    "Promedio 2024" landing almost exactly at the same
                    height as the April 2026 end label). */}
                <text
                  data-chart-reference-label
                  x={layout.padding.left}
                  y={referenceY - 6}
                  textAnchor="start"
                  fontSize={10.5}
                  fill="var(--color-muted)"
                  className="font-mono"
                >
                  {`Promedio ${reference!.year}`}
                </text>
              </g>
            ) : null}

            <polyline
              fill="none"
              stroke="var(--color-olive)"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={layout.coords
                .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
                .join(" ")}
            />

            {active ? (
              <>
                <line
                  x1={active.x}
                  y1={layout.padding.top}
                  x2={active.x}
                  y2={view.height - layout.padding.bottom}
                  stroke="var(--color-muted)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={active.x}
                  cy={active.y}
                  r={5}
                  fill="var(--color-ink)"
                  stroke="var(--color-surface)"
                  strokeWidth={2.5}
                />
              </>
            ) : null}

            <circle cx={last.x} cy={last.y} r={4.5} fill="var(--color-olive)" />
            <text
              data-chart-end-label
              x={last.x}
              y={last.y - 14}
              textAnchor="end"
              fontSize={13}
              fontWeight={600}
              fill="var(--color-ink)"
              className="font-mono"
            >
              {formatValue(values[values.length - 1])}
            </text>

            <text
              x={layout.padding.left}
              y={view.height - 4}
              fontSize={11}
              fill="var(--color-muted)"
              className="font-mono"
            >
              {formatPeriod(first.period)}
            </text>
            <text
              x={view.width - layout.padding.right}
              y={view.height - 4}
              fontSize={11}
              fill="var(--color-muted)"
              textAnchor="end"
              className="font-mono"
            >
              {formatPeriod(last.period)}
            </text>
          </svg>

          {activeIndex !== null && activePoint && tooltipPos ? (
            <div
              data-chart-tooltip
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[118%] rounded-lg bg-ink px-3 py-2 font-mono text-xs whitespace-nowrap text-surface shadow-card"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
            >
              <p className="text-surface/70">{formatPeriod(activePoint.period)}</p>
              <p className="text-sm font-semibold">{formatValue(activePoint.value)}</p>
              <p>
                {describeDelta(
                  activeDelta ?? { direction: "flat", fraction: null },
                  formatVariation,
                )}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const headlineValue = values[values.length - 1];

  return (
    <div>
      <div
        role="group"
        aria-label="Elegir cómo ver los montos"
        className="inline-flex rounded-full border border-rule bg-surface-2 p-1"
      >
        <button
          type="button"
          aria-pressed={mode === "real"}
          onClick={() => setMode("real")}
          className={`min-h-9 rounded-full px-4 font-mono text-sm font-semibold ${
            mode === "real" ? "bg-surface text-ink shadow-control" : "text-muted"
          }`}
        >
          Real
        </button>
        <button
          type="button"
          aria-pressed={mode === "nominal"}
          onClick={() => setMode("nominal")}
          className={`min-h-9 rounded-full px-4 font-mono text-sm font-semibold ${
            mode === "nominal" ? "bg-surface text-ink shadow-control" : "text-muted"
          }`}
        >
          Nominal
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <p
          data-chart-headline-value
          className="font-mono text-[clamp(24px,5vw,32px)] font-semibold text-ink tabular-nums"
        >
          {formatValue(headlineValue)}
        </p>
        {headlineDelta.fraction !== null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
              headlineDelta.direction === "up"
                ? "bg-olive-tint text-olive"
                : headlineDelta.direction === "down"
                  ? "bg-stamp-tint text-stamp"
                  : "bg-surface-2 text-muted"
            }`}
          >
            <span aria-hidden="true">
              {headlineDelta.direction === "up"
                ? "▲"
                : headlineDelta.direction === "down"
                  ? "▼"
                  : ""}
            </span>
            {formatVariation(headlineDelta.fraction)}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {unitNoteFor(mode, baseMonthLabel)}
      </p>

      <div className="mt-3 w-full">
        {renderVariant("mobile", MOBILE_VIEW, "h-[50vh] max-h-[480px] min-h-[280px] w-full sm:hidden")}
        {renderVariant("desktop", DESKTOP_VIEW, "hidden h-[420px] w-full sm:block")}
      </div>

      <p className="mt-2 font-mono text-[11.5px] text-muted">
        Pasá el dedo o el mouse por el gráfico para ver cada mes. También podés
        navegar con las flechas del teclado.
      </p>
      <p id={readoutId} data-chart-readout aria-live="polite" className="sr-only">
        {readoutText()}
      </p>
    </div>
  );
}
