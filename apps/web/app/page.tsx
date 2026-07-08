import Link from "next/link";
import { ColorLegend } from "@/components/ColorLegend";
import { Sparkline } from "@/components/chart/Sparkline";
import { SiteHeader } from "@/components/SiteHeader";
import { computeCoparticipacionTrend } from "@/lib/insight";
import {
  formatArsHuman,
  formatPeriodEsAr,
  formatVariationEsAr,
} from "@/lib/format";
import { getPortalData, resolveSourceRef, shortHash } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * "Home = afiche" (DESIGN.md v2 "dashboard cívico premium"): one number
 * dominates the fold, then a row per section -- no landing-page marketing
 * copy, no carousels. Section questions are Fraunces headings per the
 * design system's doctrine that section titles ask a question; the whole
 * row is the link (not just a small "ver →" affordance), so a big
 * thumb-friendly tap target covers the entire question, with a trailing
 * chevron plus a one-line plain-language description of what's inside.
 *
 * Slice 3 headline money count-up decision: the hero peso figure renders
 * `formatArsHuman(...)` directly, statically, with NO `<CountUp>` --
 * deliberately reversed from slice 1/2's original plan. A count-up on an
 * EXACT currency headline necessarily passes through intermediate values
 * that are, briefly, wrong: e.g. counting toward "$ 1.750 millones" spends
 * most of the animation showing figures like "$ 875 millones" or "$ 1.200
 * millones" that are not what the municipality actually received. On a
 * transparency portal whose entire premise is "never misrepresent a
 * figure", that is a real (if momentary) integrity problem, even though
 * the SSR/first-render value was always technically correct before this
 * slice (`useCountUp` never flashes a bare "0" -- the risk was the
 * animated PATH between mount and settle, not the start/end values).
 * `<CountUp>` stays in use exactly once elsewhere on the site: the
 * /transparencia 81/100 score (see that page's module docstring) -- a
 * RATING, not an exact peso amount, so every intermediate value while
 * counting up is still a truthful partial reading of the same rating,
 * never a misrepresented currency figure. See DESIGN.md's decisions log
 * for the same rationale recorded as a project-level decision.
 */
const SECTION_ROWS = [
  {
    question: "¿Cuánto llegó este mes?",
    description: "Coparticipación mensual, ajustada por inflación.",
    href: "/coparticipacion",
  },
  {
    question: "¿Qué dicen las multas del Tribunal de Cuentas?",
    description: "Fallos con sanciones económicas, por ejercicio.",
    href: "/fallos",
  },
  {
    question: "¿Qué tan transparente es el municipio?",
    description: "Índice fiscal de ASAP y qué falta para llegar a 100.",
    href: "/transparencia",
  },
  {
    question: "¿De dónde salen los datos?",
    description: "Fuente oficial, copia archivada y sha256 de cada cifra.",
    href: "/fuentes",
  },
] as const;

/**
 * Compact index chips right under the hero number so at least one
 * question-action is reachable above the fold on a short mobile viewport,
 * even before the full section-row nav further down. Same 3 destinations
 * as SECTION_ROWS, short labels for a single-line tap target.
 */
const INDEX_CHIPS = [
  { label: "Plata que entra", href: "/coparticipacion" },
  { label: "Multas", href: "/fallos" },
  { label: "Fuentes", href: "/fuentes" },
] as const;

export default function Home() {
  const { coparticipacion, manifest } = getPortalData();
  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const points = coronelRosales?.points ?? [];
  const latestPoint = points.at(-1);
  const previousPoint = points.at(-2);
  // Real (inflation-adjusted) month-over-month variation -- legitimate
  // arithmetic coloring per DESIGN.md's neutrality rule (never a political
  // "good/bad" judgment). Only rendered when both points actually exist, so
  // a short series never fabricates a variation out of thin air.
  const variation =
    latestPoint && previousPoint && previousPoint.realArs !== 0
      ? (latestPoint.realArs - previousPoint.realArs) / previousPoint.realArs
      : null;
  const previousMonthName = previousPoint
    ? formatPeriodEsAr(previousPoint.period).split(" de ")[0]
    : null;
  const baseMonthLabel = formatPeriodEsAr(coparticipacion.baseMonth);
  const dataThroughLabel = formatPeriodEsAr(coparticipacion.dataThrough);
  // The DATA-DRIVEN plain-language conclusion, same source as
  // /coparticipacion's leading sentence (lib/insight.ts) -- never a
  // hardcoded home-page claim.
  const trend = computeCoparticipacionTrend(points);
  // Provenance for the headline figure (INVIOLABLE #2: source + copia
  // archivada + sha256 corto on every headline figure) -- the primary
  // coparticipación source is always the first sourceRefs id.
  const primarySourceRef = resolveSourceRef(
    coparticipacion.sourceRefs[0],
    manifest,
  );

  return (
    <>
      {/* Home ("/") has no nested layout.tsx, so it renders SiteHeader
          itself with activeHref={null} -- none of the section nav items
          correspond to home. See app/layout.tsx's comment. */}
      <SiteHeader activeHref={null} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        {/* The masthead already carries the brand visually; this heading only
          gives the page a single accessible <h1> naming the site (rebrand
          invariant), without repeating the wordmark inside the poster. */}
        <h1 className="sr-only">¿Dónde va la plata? — Coronel Rosales</h1>

        {/* One-line subhead, visible without scrolling: says what this site
          IS before the hero number says what it's showing. */}
        <p className="max-w-[46ch] text-base text-ink">
          Portal vecinal independiente que sigue la plata pública de Coronel
          Rosales.
        </p>

        {latestPoint ? (
          <section aria-label="Cifra destacada del mes" className="mt-6">
            {/* Kicker strengthened + darkened (stamp red, DESIGN.md's
              canonical kicker color) and enlarged so it reads at arm's
              length -- it's the sentence that resolves the title/number
              mismatch by saying explicitly this is money that CAME IN. */}
            <p className="font-mono text-sm font-semibold tracking-[0.1em] text-stamp uppercase sm:text-base">
              Lo que Coronel Rosales recibió de la Provincia en{" "}
              {formatPeriodEsAr(latestPoint.period)}
            </p>
            <p className="mt-1 font-mono text-[clamp(52px,11vw,128px)] leading-[0.95] font-semibold tracking-tight text-ink tabular-nums">
              {/* No CountUp here on purpose -- see this module's docstring
                  "Slice 3 headline money count-up decision": an exact peso
                  figure must never render a wrong intermediate value while
                  animating. */}
              {formatArsHuman(Math.round(latestPoint.realArs))}
            </p>
            {variation !== null && previousMonthName ? (
              <p
                className={`mt-4 inline-block border-2 px-3 py-1 font-mono text-[clamp(15px,2.4vw,20px)] tabular-nums ${
                  variation >= 0
                    ? "border-olive text-olive"
                    : "border-stamp text-stamp"
                }`}
              >
                <span className="sr-only">Variación real: </span>
                <span aria-hidden="true">
                  {variation >= 0 ? "▲" : "▼"}
                </span>{" "}
                {formatVariationEsAr(variation)} más que en {previousMonthName},
                ya descontada la inflación
              </p>
            ) : null}

            {/* Data-driven plain-language conclusion (same source as
                /coparticipacion, lib/insight.ts) -- never hardcoded. */}
            <p className="mt-4 max-w-[42ch] font-display text-[clamp(17px,2.4vw,20px)] font-semibold text-ink">
              {trend.message}
            </p>

            {points.length > 1 ? (
              <div className="mt-4 max-w-[320px]">
                <Sparkline
                  points={points.map((point) => ({
                    period: point.period,
                    value: point.realArs,
                  }))}
                />
              </div>
            ) : null}

            <p className="mt-4 max-w-[46ch] text-base text-ink">
              La coparticipación es la plata que la Provincia le gira al
              municipio todos los meses.
            </p>

            <ul
              aria-label="Accesos rápidos"
              className="mt-5 flex flex-wrap gap-3"
            >
              {INDEX_CHIPS.map((chip) => (
                <li key={chip.href}>
                  <Link
                    href={chip.href}
                    className="inline-flex min-h-11 items-center border-2 border-ink px-4 font-mono text-sm text-ink no-underline hover:bg-ink hover:text-surface"
                  >
                    {chip.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Dual-link + sha256 provenance for the headline figure
                (INVIOLABLE #2 -- every headline figure shows source, copia
                archivada and a short sha256, never just a source name). */}
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
              <span>Fuente:</span>
              <a
                href={primarySourceRef.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Fuente original
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
              <span aria-hidden="true">·</span>
              {primarySourceRef.archivedUrl ? (
                <a
                  href={primarySourceRef.archivedUrl}
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
                <span>Copia archivada no disponible</span>
              )}
              <span aria-hidden="true">·</span>
              <span>sha256 {shortHash(primarySourceRef.sha256)}</span>
              <span aria-hidden="true">·</span>
              <span>datos hasta {dataThroughLabel}</span>
              <span className="text-ink">· comparado en plata de hoy</span>
              <span>(en pesos constantes de {baseMonthLabel}, IPC INDEC)</span>
            </p>

            <ColorLegend className="mt-6 max-w-[46ch]" headingLevel="h2" />
          </section>
        ) : null}

        <nav
          aria-label="Secciones del portal"
          className="mt-10 border-t border-rule"
        >
          {SECTION_ROWS.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className="flex min-h-11 items-center justify-between gap-4 border-b border-rule py-5 no-underline hover:bg-surface"
            >
              <span>
                <h2 className="font-display text-[clamp(20px,3vw,28px)] font-semibold text-ink">
                  {row.question}
                </h2>
                <span className="mt-1 block text-sm text-ink-2">
                  {row.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="font-display text-2xl text-stamp"
              >
                ›
              </span>
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
