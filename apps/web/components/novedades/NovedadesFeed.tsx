import { formatDateEsAr } from "@/lib/format";
import type { NovedadEvent, NovedadesData, NovedadKind } from "@/lib/schemas";

/**
 * NovedadesFeed (feature H2b): the watchdog "novedades" publication-
 * behavior log -- reads as "what did the municipality publish, and what
 * remains unpublished past the ASAP/Ordenanza 3638 expectations", a
 * neutral, factual log, never an accusation. Every event's `kind` is
 * visibly labeled (never blended silently, per the HONESTY requirement):
 *
 * - "seeded": a hand-curated, human-verified historical fact.
 * - "auto-detected": a NEW document found by diffing two archived
 *   mcr.gob.ar listing snapshots -- grows every month the cron runs.
 * - "auto-stale": a LIVE status re-derived every build from
 *   `data/cadencia.json`'s own numbers (never fabricated here).
 *
 * `date`/`elapsedDays`-style figures are pre-computed at ETL build time
 * (see `etl/etl/novedades.py`) -- this component never reads `Date.now()`,
 * so it stays safe for static prerender.
 */
const KIND_LABEL: Record<NovedadKind, string> = {
  seeded: "Dato verificado a mano",
  "auto-detected": "Detectado automáticamente",
  "auto-stale": "Estado en vivo",
};

// "auto-stale" facts (an ongoing publication gap) use the same `--ocre`
// "aviso documental" token as DeudaCounter/CadenceDashboard -- never
// `--stamp`/alarm-red, per DESIGN.md's neutrality rule: this documents a
// cadence fact, not a judgment. "seeded"/"auto-detected" facts are
// positive/neutral publication events, so they use the plain surface
// treatment (same precedent as CadenceDashboard's full-mark dimensions).
function isStaleKind(kind: NovedadKind): boolean {
  return kind === "auto-stale";
}

function EventItem({ event }: { event: NovedadEvent }) {
  const stale = isStaleKind(event.kind);
  return (
    <li
      className={
        stale
          ? "rounded-lg border border-ocre border-l-[5px] bg-ocre-soft p-4"
          : "rounded-lg border border-rule bg-surface p-4 shadow-card"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          {KIND_LABEL[event.kind]}
        </span>
        {event.date ? (
          <span className="font-mono text-xs text-ink-2">
            {formatDateEsAr(event.date)}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 font-display text-base font-semibold text-ink">
        {event.title}
      </p>
      {event.detail ? (
        <p className="mt-1 max-w-[62ch] text-sm text-ink-2">{event.detail}</p>
      ) : null}
    </li>
  );
}

export function NovedadesFeed({ novedades }: { novedades: NovedadesData }) {
  if (novedades.events.length === 0) {
    return (
      <p className="text-sm text-muted">
        Sin novedades registradas todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {novedades.events.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </ul>
  );
}
