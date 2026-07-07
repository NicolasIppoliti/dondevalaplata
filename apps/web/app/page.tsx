import Link from "next/link";
import {
  formatArsCompact,
  formatPeriodEsAr,
  formatVariationEsAr,
} from "@/lib/format";
import { getPortalData } from "@/lib/sources";

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

/**
 * "Home = afiche" (DESIGN.md): one number dominates the fold, then a row
 * per section -- no landing-page marketing copy, no cards, no carousels.
 * Copy for the question and section rows comes from the owner-approved
 * design-system mockup verbatim.
 */
const SECTION_ROWS = [
  {
    question: "¿Cuánto llegó este mes?",
    href: "/coparticipacion",
    cta: "ver la serie →",
  },
  {
    question: "¿Qué dicen los fallos del Tribunal de Cuentas?",
    href: "/fallos",
    cta: "ver las multas →",
  },
  {
    question: "¿De dónde salen los datos?",
    href: "/fuentes",
    cta: "ver el archivo →",
  },
] as const;

export default function Home() {
  const { coparticipacion } = getPortalData();
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

  return (
    <div>
      {/* The masthead already carries the brand visually; this heading only
          gives the page a single accessible <h1> naming the site (rebrand
          invariant), without repeating the wordmark inside the poster. */}
      <h1 className="sr-only">¿Dónde va la plata? — Coronel Rosales</h1>

      {latestPoint ? (
        <section aria-label="Cifra destacada del mes">
          <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
            Coronel Rosales recibió de la Provincia en{" "}
            {formatPeriodEsAr(latestPoint.period)}
          </p>
          <p className="mt-1 font-mono text-[clamp(52px,11vw,128px)] leading-[0.95] font-semibold tracking-tight text-ink tabular-nums">
            {formatArsCompact(latestPoint.realArs)}
          </p>
          {variation !== null && previousMonthName ? (
            <p
              className={`mt-4 inline-block border-2 px-3 py-1 font-mono text-[clamp(18px,3vw,28px)] tabular-nums ${
                variation >= 0
                  ? "border-olive text-olive"
                  : "border-stamp text-stamp"
              }`}
            >
              <span className="sr-only">Variación real: </span>
              <span aria-hidden="true">{variation >= 0 ? "▲" : "▼"}</span>{" "}
              {formatVariationEsAr(variation)} real vs. {previousMonthName}
            </p>
          ) : null}
          <p className="mt-6 max-w-[34ch] font-quote text-[clamp(19px,2.6vw,26px)] text-muted italic">
            ¿Alcanza para lo que dicen que alcanza? Mirá la serie completa y
            sacá tu propia cuenta.
          </p>
          <p className="mt-5 font-mono text-xs text-muted">
            Fuente: Ministerio de Economía PBA · datos hasta{" "}
            {dataThroughLabel} · en pesos constantes de {baseMonthLabel} (IPC
            INDEC)
          </p>
        </section>
      ) : null}

      <nav
        aria-label="Secciones del portal"
        className="mt-10 border-t border-rule"
      >
        {SECTION_ROWS.map((row) => (
          <div
            key={row.href}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule py-5"
          >
            <h2 className="font-display text-[clamp(20px,3vw,28px)] font-semibold">
              {row.question}
            </h2>
            <Link
              href={row.href}
              className="font-mono text-[13px] whitespace-nowrap"
            >
              {row.cta}
            </Link>
          </div>
        ))}
      </nav>
    </div>
  );
}
