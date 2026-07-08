import Link from "next/link";
import { ColorLegend } from "@/components/ColorLegend";
import { InteractiveCoparticipacionChart } from "@/components/chart/InteractiveCoparticipacionChart";
import { Sparkline } from "@/components/chart/Sparkline";
import { FalloCard } from "@/components/fallos/FalloCard";
import { SiteHeader } from "@/components/SiteHeader";
import { TransparenciaGauge } from "@/components/TransparenciaGauge";
import { computeCoparticipacionTrend } from "@/lib/insight";
import {
  formatArsHuman,
  formatPeriodEsAr,
  formatVariationEsAr,
  splitArsUnit,
} from "@/lib/format";
import {
  getPortalData,
  resolveSourceRef,
  selectFallosPreview,
  shortHash,
} from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/** Shared "ver todo →" link, reused by every dashboard card below the
 * hero -- min-h-11 tap target, mono to match the site's data/UI-control
 * typeface, `--stamp` on hover per the site's link-underline convention. */
function VerTodoLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 flex-none items-center gap-1 font-mono text-sm font-semibold text-ink no-underline hover:text-stamp"
    >
      Ver todo <span aria-hidden="true">→</span>
    </Link>
  );
}

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
 *
 * Fidelity slice F2 (Mockup A, see DESIGN.md decisions log): the landing
 * BELOW the hero is a dense dashboard, not a table-of-contents of plain
 * accordion rows -- a coparticipación chart card (reuses
 * `InteractiveCoparticipacionChart`), a real fallos grid (reuses
 * `FalloCard`, never hidden behind a year index), and the ASAP
 * transparencia gauge (reuses `TransparenciaGauge`). Each section keeps its
 * question heading (Fraunces) + a "ver todo →" link to the full route.
 * Only "¿De dónde salen los datos?" stays the old simple, whole-row-is-a-
 * link pattern (`FUENTES_ROW` below) -- it has no dashboard component of
 * its own to preview, just a link into /fuentes.
 */
const FUENTES_ROW = {
  question: "¿De dónde salen los datos?",
  description: "Fuente oficial, copia archivada y sha256 de cada cifra.",
  href: "/fuentes",
} as const;

export default function Home() {
  const { coparticipacion, fallos, transparencia, manifest } =
    getPortalData();
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

  // (F2) Coparticipación dashboard card -- same real+nominal point shape
  // /coparticipacion's own hero chart uses, so `InteractiveCoparticipacionChart`
  // is reused as-is (already bounded to 420px desktop / ~50vh mobile).
  const heroPoints = points.map((point) => ({
    period: point.period,
    real: point.realArs,
    nominal: point.nominalArs,
  }));

  // (F2) Fallos dashboard grid -- every record of the most recent ejercicio
  // + one representative per older ejercicio, never a whole ejercicio
  // dropped (see `selectFallosPreview`'s own honesty-guarantee docstring).
  const fallosPreview = selectFallosPreview(fallos);

  // (F2) Transparencia dashboard card -- same dimensions/trend the
  // /transparencia page itself derives from `data/transparencia.json`,
  // never a hardcoded home-page claim.
  const transparenciaGapDimensions = transparencia.dimensions.filter(
    (dimension) => dimension.got < dimension.max,
  );
  const firstTransparenciaTrendPoint = transparencia.trend[0];
  const lastTransparenciaTrendPoint =
    transparencia.trend[transparencia.trend.length - 1];
  const transparenciaDelta =
    firstTransparenciaTrendPoint && lastTransparenciaTrendPoint
      ? lastTransparenciaTrendPoint.total - firstTransparenciaTrendPoint.total
      : null;
  // Provenance for the score (INVIOLABLE #2 -- every headline figure shows
  // source, copia archivada and a short sha256): the primary (most recent)
  // ASAP report is always the first sourceRefs id, same convention as the
  // coparticipación hero figure above.
  const transparenciaPrimarySourceRef = resolveSourceRef(
    transparencia.sourceRefs[0],
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

        {/* Dashboard landing (fidelity slice F2, Mockup A): three real
            dashboard sections -- coparticipación chart, fallos grid,
            transparencia gauge -- each reusing an existing, already-tested
            app component, never a re-implementation. */}
        <div className="mt-14 space-y-14 border-t border-rule pt-12 sm:mt-20 sm:space-y-16 sm:pt-16">
          {/* Section 1: coparticipación chart card. */}
          <section aria-labelledby="home-coparticipacion-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] font-semibold tracking-[0.08em] text-stamp uppercase">
                  Coparticipación · transferencias provinciales
                </p>
                <h2
                  id="home-coparticipacion-heading"
                  className="mt-1 font-display text-[clamp(22px,3.4vw,32px)] font-semibold text-ink"
                >
                  ¿Cuánto llegó este mes?
                </h2>
                <p className="mt-1 max-w-[52ch] text-sm text-ink-2">
                  Coparticipación mensual, ajustada por inflación.
                </p>
              </div>
              <VerTodoLink href="/coparticipacion" />
            </div>

            <div className="mt-5 rounded-lg border border-rule bg-surface p-[clamp(20px,3vw,30px)] shadow-card">
              {/* Same data-driven conclusion the hero card leads with
                  (lib/insight.ts) -- repeated here, at the top of the full
                  chart preview, matching Mockup A's composition. */}
              <p className="font-display text-[clamp(18px,2.4vw,22px)] font-semibold text-ink">
                {trend.message}
              </p>
              {heroPoints.length > 0 ? (
                <div className="mt-4">
                  <InteractiveCoparticipacionChart
                    points={heroPoints}
                    baseMonthLabel={baseMonthLabel}
                  />
                </div>
              ) : null}

              {/* Dual-link + sha256 provenance for the chart's underlying
                  figures (INVIOLABLE #2), same primary source as the hero
                  card above. */}
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-4 font-mono text-xs text-muted">
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
              </p>
            </div>
          </section>

          {/* Section 2: multas grid -- real FalloCard fichas, never hidden
              behind a year index (the audit flagged /fallos's index-only
              landing; the home preview shows real cards directly). */}
          <section aria-labelledby="home-fallos-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] font-semibold tracking-[0.08em] text-stamp uppercase">
                  Tribunal de Cuentas · fallos
                </p>
                <h2
                  id="home-fallos-heading"
                  className="mt-1 font-display text-[clamp(22px,3.4vw,32px)] font-semibold text-ink"
                >
                  ¿Qué dicen las multas del Tribunal de Cuentas?
                </h2>
                <p className="mt-1 max-w-[52ch] text-sm text-ink-2">
                  Fallos con sanciones económicas, por ejercicio.
                </p>
              </div>
              <VerTodoLink href="/fallos" />
            </div>

            <p className="mt-4 max-w-[70ch] border-l-[5px] border-ocre bg-surface py-3 pl-4 text-sm text-ink">
              El Tribunal de Cuentas de la Provincia revisa las cuentas de
              cada ejercicio y puede aplicar multas a funcionarios.{" "}
              <strong>
                Mismo criterio, mismo formato y misma procedencia para toda
                gestión
              </strong>{" "}
              — la neutralidad es estructural, no una opinión.
            </p>

            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fallosPreview.map((record, index) => (
                <li key={`${record.falloId}-${record.official}-${index}`}>
                  <FalloCard
                    record={record}
                    sourceLink={resolveSourceRef(
                      record.sourceRefs[0],
                      manifest,
                    )}
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3: ASAP transparencia gauge card. */}
          <section aria-labelledby="home-transparencia-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] font-semibold tracking-[0.08em] text-stamp uppercase">
                  Índice de Transparencia Fiscal Municipal
                </p>
                <h2
                  id="home-transparencia-heading"
                  className="mt-1 font-display text-[clamp(22px,3.4vw,32px)] font-semibold text-ink"
                >
                  ¿Qué tan transparente es el municipio?
                </h2>
                <p className="mt-1 max-w-[52ch] text-sm text-ink-2">
                  Índice fiscal de ASAP y qué falta para llegar a 100.
                </p>
              </div>
              <VerTodoLink href="/transparencia" />
            </div>

            <div className="mt-5 flex flex-col gap-6 rounded-lg border border-rule bg-surface p-[clamp(20px,3vw,30px)] shadow-card sm:flex-row sm:items-center">
              <TransparenciaGauge
                value={transparencia.total}
                max={transparencia.max}
                size={128}
              />
              <div>
                <p className="font-display text-xl font-semibold text-ink">
                  {transparencia.category}
                </p>
                {transparenciaDelta !== null && firstTransparenciaTrendPoint ? (
                  <p
                    className={`mt-1 inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold ${
                      transparenciaDelta >= 0 ? "text-olive" : "text-stamp"
                    }`}
                  >
                    <span className="sr-only">Variación del puntaje: </span>
                    <span aria-hidden="true">
                      {transparenciaDelta >= 0 ? "▲" : "▼"}
                    </span>
                    {transparenciaDelta >= 0 ? "+" : ""}
                    {transparenciaDelta} vs. {firstTransparenciaTrendPoint.reportLabel}
                  </p>
                ) : null}

                {/* ASAP attribution -- explicit that it's a civil
                    association (never a ministry) and that the scope is
                    FISCAL transparency, not integral. */}
                <p className="mt-3 max-w-[46ch] text-sm text-ink-2">
                  Lo publica{" "}
                  <strong className="text-ink">{transparencia.source}</strong>{" "}
                  ({transparencia.sourceType}). Mide transparencia{" "}
                  <strong className="text-ink">fiscal</strong>, no integral.
                </p>

                {/* Compact "qué falta" hint -- the full breakdown lives at
                    /transparencia; this only names the count + the top
                    pending dimension, never a judgment of any official. */}
                {transparenciaGapDimensions.length > 0 ? (
                  <p className="mt-2 max-w-[46ch] text-sm text-muted">
                    Qué falta: {transparenciaGapDimensions.length} de{" "}
                    {transparencia.dimensions.length}{" "}
                    dimensiones fiscales, incluida &quot;
                    {transparenciaGapDimensions[0].name}&quot;.
                  </p>
                ) : null}

                {/* Dual-link + sha256 provenance for the score
                    (INVIOLABLE #2). */}
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
                  <span>Fuente:</span>
                  <a
                    href={transparenciaPrimarySourceRef.sourceUrl}
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
                  {transparenciaPrimarySourceRef.archivedUrl ? (
                    <a
                      href={transparenciaPrimarySourceRef.archivedUrl}
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
                  <span>
                    sha256 {shortHash(transparenciaPrimarySourceRef.sha256)}
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* "¿De dónde salen los datos?" stays the simple, whole-row-is-a-
              link pattern -- no dashboard component to preview, just a
              link into /fuentes. */}
          <Link
            href={FUENTES_ROW.href}
            className="flex min-h-11 items-center justify-between gap-4 border-t border-rule py-5 no-underline hover:bg-surface"
          >
            <span>
              <h2 className="font-display text-[clamp(20px,3vw,28px)] font-semibold text-ink">
                {FUENTES_ROW.question}
              </h2>
              <span className="mt-1 block text-sm text-ink-2">
                {FUENTES_ROW.description}
              </span>
            </span>
            <span aria-hidden="true" className="font-display text-2xl text-stamp">
              ›
            </span>
          </Link>

          {/* Relocated out of the hero (Mockup A fidelity slice F1): the
              neutrality explainer sits near the colored figures it explains
              (the variation chip, the fallos ocre accent, the transparencia
              trend badge above), before the footer. */}
          <ColorLegend headingLevel="h2" />
        </div>
      </main>
    </>
  );
}
