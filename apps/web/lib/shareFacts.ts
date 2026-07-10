import { formatArsHuman, formatPeriodEsAr } from "./format";
import { SITE_HOST, SITE_URL } from "./site";
import { getPortalData, type PortalData } from "./sources";

/**
 * Feature H3b (share cards): the small, curated set of "sharp facts" the
 * portal offers one-tap SHARE for (deuda counter, transparencia score,
 * coparticipación del último mes). Every value here is derived from the
 * ALREADY-BUILT `data/*.json` this page loads anyway via `getPortalData()`
 * -- never a new fetch, never `Date.now()` at render -- same build-time-
 * only doctrine (DESIGN.md INVIOLABLE #4) as every other figure on the
 * site. Strictly factual/neutral copy: states the fact, never an opinion.
 */

const CORONEL_ROSALES_MUNICIPIO_ID = "06182";

export const SHARE_FACT_IDS = ["deuda", "transparencia", "coparticipacion"] as const;
export type ShareFactId = (typeof SHARE_FACT_IDS)[number];

export interface ShareFact {
  id: ShareFactId;
  kicker: string;
  headline: string;
  value: string;
  caption: string;
  sourceLabel: string;
  pageHref: string;
  /** Manifest ids this fact's headline figure is sourced from (INVIOLABLE
   * #2: every headline figure carries dual-link + sha256 provenance). */
  sourceRefs: string[];
}

export function isShareFactId(id: string): id is ShareFactId {
  return (SHARE_FACT_IDS as readonly string[]).includes(id);
}

function buildDeudaFact(portal: PortalData): ShareFact {
  const { deuda } = portal.cadencia;
  return {
    id: "deuda",
    kicker: "Deuda pública",
    headline: `El municipio no actualiza su deuda hace ${deuda.elapsedDays} días`,
    value: String(deuda.elapsedDays),
    caption: `Días sin publicar el stock de deuda pública. Último dato: ${deuda.lastPeriod} (${deuda.lastFigureLabel}).`,
    sourceLabel: `${deuda.ordenanzaRef}, ${deuda.ordenanzaArticle}`,
    pageHref: "/transparencia#deuda-counter-heading",
    sourceRefs: deuda.sourceRefs,
  };
}

function buildTransparenciaFact(portal: PortalData): ShareFact {
  const { transparencia } = portal;
  return {
    id: "transparencia",
    kicker: "Transparencia fiscal",
    headline: `Coronel Rosales: ${transparencia.total}/${transparencia.max} en transparencia fiscal municipal`,
    value: `${transparencia.total}/${transparencia.max}`,
    caption: `${transparencia.category}, según ${transparencia.sourceFullName} (${transparencia.reportLabel}).`,
    sourceLabel: `${transparencia.source} (${transparencia.sourceType})`,
    pageHref: "/transparencia",
    sourceRefs: transparencia.sourceRefs,
  };
}

function buildCoparticipacionFact(portal: PortalData): ShareFact {
  const { coparticipacion } = portal;
  const coronelRosales = coparticipacion.series.find(
    (series) => series.municipioId === CORONEL_ROSALES_MUNICIPIO_ID,
  );
  const lastPoint = coronelRosales?.points[coronelRosales.points.length - 1];
  const periodLabel = lastPoint ? formatPeriodEsAr(lastPoint.period) : "s/d";
  const amount = lastPoint ? formatArsHuman(lastPoint.realArs) : "s/d";
  return {
    id: "coparticipacion",
    kicker: "Coparticipación",
    headline: `Coparticipación de ${periodLabel}: ${amount}`,
    value: amount,
    caption: `Coronel Rosales, en pesos constantes de ${formatPeriodEsAr(coparticipacion.baseMonth)} (IPC INDEC).`,
    sourceLabel: "Provincia de Buenos Aires (transferencias-municipios)",
    pageHref: "/coparticipacion",
    sourceRefs: coparticipacion.sourceRefs,
  };
}

export function getShareFacts(): ShareFact[] {
  const portal = getPortalData();
  return [
    buildDeudaFact(portal),
    buildTransparenciaFact(portal),
    buildCoparticipacionFact(portal),
  ];
}

export function getShareFact(id: string): ShareFact | undefined {
  if (!isShareFactId(id)) return undefined;
  return getShareFacts().find((fact) => fact.id === id);
}

/** Absolute `/compartir/[id]` URL on the real production domain -- the
 * link every share action (Web Share API, WhatsApp, copy-link) sends. */
export function shareUrlFor(fact: ShareFact): string {
  return `${SITE_URL}/compartir/${fact.id}`;
}

/** Plain-text share payload: the fact's headline plus the site URL, so a
 * WhatsApp message is legible even before the link preview loads. */
export function shareTextFor(fact: ShareFact): string {
  return `${fact.headline} — ${SITE_HOST}`;
}
