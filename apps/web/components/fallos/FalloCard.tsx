import { formatDateEsAr, formatFineArs } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";
import type { FalloRecord } from "@/lib/schemas";

/**
 * Canonical fallo card (DESIGN.md "Componentes canónicos"): a 6px `--ocre`
 * left border, mono uppercase meta, a Fraunces name/role heading, a mono
 * fine amount, an optional Newsreader italic quote, a scanned badge when
 * applicable, and a compact provenance line with a dual link + short
 * sha256. Template is STRUCTURALLY IDENTICAL for every record regardless
 * of administration -- neutrality is structural, not a matter of styling
 * one official differently from another.
 *
 * The Fraunces heading and the large mono fine restate information that is
 * ALSO present, fully labeled, in the `<dl>` below -- same "visual
 * companion + accessible source of truth" split already used by
 * `SvgChart`/`DataTable` (design D7). The big fine display is
 * `aria-hidden` so screen readers hear the amount once, via its labeled
 * `<dl>` entry, not twice.
 *
 * `quote` is optional and intentionally unused today: no `fallos.json`
 * record currently carries a verbatim quoted excerpt (the ETL/schema has
 * no such field yet), so nothing here fabricates one. When that field
 * exists, this component already renders it in Newsreader italics.
 */

export const FALLO_FIELD_LABELS = {
  falloId: "Expediente",
  falloDate: "Fecha del fallo",
  administration: "Gestión",
  official: "Funcionario/a",
  role: "Cargo",
  fineArs: "Multa",
  documentStatus: "Estado del documento",
} as const;

interface FalloCardProps {
  record: FalloRecord;
  sourceLink: SourceLink;
  quote?: string;
}

export function FalloCard({ record, sourceLink, quote }: FalloCardProps) {
  return (
    <article className="rounded-lg border border-rule border-l-[6px] border-l-ocre bg-surface p-6 shadow-card">
      <p className="font-mono text-[13px] tracking-[0.1em] text-muted uppercase">
        Ejercicio {record.ejercicio} · fallo del{" "}
        {formatDateEsAr(record.falloDate)}
        {record.scanned ? (
          <span className="ml-2 inline-block rounded-full border border-ocre bg-ocre-soft px-2 py-0.5 text-[11px] tracking-[0.08em] text-ink normal-case">
            documento escaneado — texto no extraído
          </span>
        ) : null}
      </p>

      <h2 className="mt-1.5 font-display text-xl font-semibold text-ink">
        {record.official} — {record.role}
      </h2>

      <p
        aria-hidden="true"
        className="mt-2 font-mono text-[26px] text-ink tabular-nums"
      >
        {formatFineArs(record.fineArs)}
      </p>

      {quote ? (
        <blockquote className="mt-3 max-w-[60ch] border-l-2 border-rule pl-4 font-quote text-[17px] text-muted italic">
          «{quote}»
        </blockquote>
      ) : null}

      <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 font-mono text-[13px] text-muted">
        <dt>{FALLO_FIELD_LABELS.falloId}</dt>
        <dd className="text-ink">{record.falloId}</dd>

        <dt>{FALLO_FIELD_LABELS.falloDate}</dt>
        <dd className="text-ink">{formatDateEsAr(record.falloDate)}</dd>

        <dt>{FALLO_FIELD_LABELS.administration}</dt>
        <dd className="text-ink">{record.administration}</dd>

        <dt>{FALLO_FIELD_LABELS.official}</dt>
        <dd className="text-ink">{record.official}</dd>

        <dt>{FALLO_FIELD_LABELS.role}</dt>
        <dd className="text-ink">{record.role}</dd>

        <dt>{FALLO_FIELD_LABELS.fineArs}</dt>
        <dd className="text-ink">{formatFineArs(record.fineArs)}</dd>

        <dt>{FALLO_FIELD_LABELS.documentStatus}</dt>
        <dd className="text-ink">
          {record.textExtracted
            ? "Texto extraído del PDF original"
            : "Documento escaneado, texto no extraído"}
        </dd>
      </dl>

      <p className="mt-4 font-mono text-[11.5px] break-all text-muted">
        Expte. {record.falloId} ·{" "}
        <a href={sourceLink.sourceUrl} target="_blank" rel="noopener noreferrer">
          fallo oficial (PDF)
        </a>{" "}
        ·{" "}
        {sourceLink.archivedUrl ? (
          <a
            href={sourceLink.archivedUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            copia archivada
          </a>
        ) : (
          <span>copia archivada no disponible</span>
        )}{" "}
        · sha256 {shortHash(sourceLink.sha256)}
      </p>
    </article>
  );
}
