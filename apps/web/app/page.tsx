import Link from "next/link";
import { ColorLegend } from "@/components/ColorLegend";
import { Sparkline } from "@/components/chart/Sparkline";
import { SiteHeader } from "@/components/SiteHeader";
import { computeCoparticipacionTrend } from "@/lib/insight";
import {
  formatArsHuman,
  formatPeriodEsAr,
  formatVariationEsAr,
  splitArsUnit,
} from "@/lib/format";
import { getPortalData, resolveSourceRef, shortHash } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * Home hero (DESIGN.md v2 "dashboard cívico premium", fidelity slice F1 --
 * see DESIGN.md decisions log): a TWO-COLUMN hero on desktop, matching the
 * approved Mockup A composition exactly -- editorial column (eyebrow,
 * Fraunces headline with "plata pública" in `--stamp`, supporting line,
 * two CTAs, freshness pill) on the left, a FLOATING premium figure card on
 * the right. Single column on mobile (grid collapses at `lg`).
 *
 * Slice 3's headline money count-up decision still holds: the hero peso
 * figure renders `formatArsHuman(...)` directly, statically, with NO
 * `<CountUp>` -- a count-up on an EXACT currency headline necessarily
 * passes through intermediate values that are, briefly, wrong (e.g.
 * counting toward "$ 1.750 millones" spends most of the animation showing
 * figures that are not what the municipality actually received). F1 adds
 * `splitArsUnit` (lib/format.ts) purely to render the "millones"/"mil
 * millones" word at a smaller, muted scale beside the amount, matching the
 * card's "refined scale" per the mockup -- it never re-derives or rounds
 * the number again, so the exact-value guarantee is unchanged. `<CountUp>`
 * stays in use exactly once elsewhere on the site: the /transparencia
 * 81/100 score (a RATING, not an exact peso amount). See DESIGN.md's
 * decisions log for the same rationale recorded as a project-level
 * decision.
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
  // "abril de 2026" -> "abril 2026": the compact freshness-pill phrasing
  // Mockup A uses. Only a spacing/copy tweak of the same underlying,
  // data-driven label -- never a different month.
  const dataThroughCompactLabel = formatPeriodEsAr(
    coparticipacion.dataThrough,
  ).replace(" de ", " ");
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
  const { amount: heroAmount, unit: heroUnit } = latestPoint
    ? splitArsUnit(formatArsHuman(Math.round(latestPoint.realArs)))
    : { amount: "", unit: null };

  return (
    <>
      {/* Home ("/") has no nested layout.tsx, so it renders SiteHeader
          itself with activeHref={null} -- none of the section nav items
          correspond to home. See app/layout.tsx's comment. */}
      <SiteHeader activeHref={null} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10 sm:py-14"
      >
        {/* The masthead already carries the brand visually; this heading only
          gives the page a single accessible <h1> naming the site (rebrand
          invariant), without repeating the wordmark inside the poster. */}
        <h1 className="sr-only">¿Dónde va la plata? — Coronel Rosales</h1>

        {/* Two-column hero: editorial column (left) + floating premium
            figure card (right) on desktop; single column, card-first
            visual weight preserved, on mobile. */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_1fr] lg:gap-12">
          {/* LEFT: editorial column */}
          <div>
            <p className="font-mono text-[12.5px] font-semibold tracking-[0.09em] text-stamp uppercase">
              Portal vecinal independiente
            </p>
            <h2 className="mt-2 font-display text-[clamp(30px,6vw,52px)] font-bold leading-[1.02] tracking-tight text-ink">
              Seguimos la <span className="text-stamp">plata pública</span> de
              Coronel Rosales.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[17.5px] text-ink-2">
              Cada cifra enlaza su fuente oficial, una copia archivada y su
              huella{" "}
              <code className="rounded-[5px] border border-rule bg-surface-2 px-1.5 py-px font-mono text-[0.82em]">
                sha256
              </code>
              . No opinamos sobre ninguna gestión: mostramos los números que
              se pueden chequear.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/coparticipacion"
                className="inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-ink bg-ink px-5 font-sans text-[15px] font-semibold text-surface no-underline transition-colors hover:border-stamp hover:bg-stamp"
              >
                Ver la coparticipación
              </Link>
              <Link
                href="/fuentes"
                className="inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-ink px-5 font-sans text-[15px] font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface"
              >
                Cómo verificamos
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-dashed border-muted px-3 py-[5px] font-mono text-xs text-muted">
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] flex-none rounded-full bg-olive"
              />
              Datos hasta {dataThroughCompactLabel} — la Provincia publica con
              2 a 3 meses de rezago
            </p>
          </div>

          {/* RIGHT: floating premium figure card */}
          {latestPoint ? (
            <section
              aria-label="Cifra destacada del mes"
              className="rounded-lg border border-rule bg-surface p-[clamp(20px,3vw,30px)] shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12.5px] tracking-[0.04em] text-muted uppercase">
                  Coparticipación recibida
                </span>
                <span className="font-mono text-[12.5px] text-ink-2">
                  {formatPeriodEsAr(latestPoint.period)}
                </span>
              </div>

              <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0 font-mono text-[clamp(38px,9vw,68px)] leading-[0.92] font-medium tracking-tight text-ink tabular-nums">
                <span>{heroAmount}</span>
                {heroUnit ? (
                  <span className="text-[clamp(14px,2.6vw,18px)] font-medium text-muted">
                    {heroUnit}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                en pesos constantes de {baseMonthLabel} (IPC INDEC)
              </p>

              {points.length > 1 ? (
                <div className="mt-4">
                  <Sparkline
                    points={points.map((point) => ({
                      period: point.period,
                      value: point.realArs,
                    }))}
                  />
                </div>
              ) : null}

              {variation !== null && previousMonthName ? (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[13px] font-semibold ${
                      variation >= 0
                        ? "bg-olive-tint text-olive"
                        : "bg-stamp-tint text-stamp"
                    }`}
                  >
                    <span className="sr-only">Variación real: </span>
                    <span aria-hidden="true" className="font-bold">
                      {variation >= 0 ? "▲" : "▼"}
                    </span>{" "}
                    {formatVariationEsAr(variation)} real vs.{" "}
                    {previousMonthName}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted">
                    variación en plata de hoy
                  </span>
                </div>
              ) : null}

              {/* Data-driven plain-language conclusion (same source as
                  /coparticipacion, lib/insight.ts) -- never hardcoded. */}
              <p className="mt-4 border-t border-rule pt-4 font-display text-[clamp(17px,2.4vw,20px)] font-semibold text-ink">
                {trend.message}
              </p>

              {/* Dual-link + sha256 provenance for the headline figure
                  (INVIOLABLE #2 -- every headline figure shows source, copia
                  archivada and a short sha256, never just a source name). */}
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
                <span>Fuente:</span>
                <a
                  href={primarySourceRef.sourceUrl}
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
              </p>
            </section>
          ) : null}
        </div>

        <nav
          aria-label="Secciones del portal"
          className="mt-14 border-t border-rule sm:mt-20"
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

        {/* Relocated out of the hero (Mockup A fidelity slice F1): the
            neutrality explainer now lives lower on the page, near the
            colored figures it explains (the variation chip above, the
            section rows' arithmetic below), not inside the poster. */}
        <ColorLegend className="mt-10" headingLevel="h2" />
      </main>
    </>
  );
}
