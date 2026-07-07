import { formatDateEsAr } from "@/lib/format";
import { shortHash, type SourceLink } from "@/lib/sources";

/**
 * Mandatory per-page sources block (source-provenance capability): every
 * data page renders, for each cited source, a link to the original official
 * URL AND a link to the portal's own archived copy, plus a shortened sha256
 * and the fetch date. A dead official URL is still shown, never hidden.
 */
interface SourcesFooterProps {
  links: SourceLink[];
  note?: string;
}

export function SourcesFooter({ links, note }: SourcesFooterProps) {
  return (
    <section
      aria-labelledby="fuentes-heading"
      className="mt-12 border-t border-rule pt-6"
    >
      <h2
        id="fuentes-heading"
        className="font-mono text-xs tracking-[0.1em] text-muted uppercase"
      >
        Fuentes y procedencia
      </h2>
      <ul className="mt-3 space-y-4">
        {links.map((link) => (
          <li key={link.id}>
            <p className="text-ink">{link.source}</p>
            <p className="flex flex-wrap gap-x-2 text-sm">
              <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer">
                Fuente original
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
              <span aria-hidden="true">·</span>
              {link.archivedUrl ? (
                <a
                  href={link.archivedUrl}
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
                <span className="text-muted">Copia archivada no disponible</span>
              )}
            </p>
            <p className="font-mono text-[11.5px] text-muted">
              sha256 {shortHash(link.sha256)} · archivado el{" "}
              {formatDateEsAr(link.fetchedAt.slice(0, 10))}
            </p>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-4 max-w-[62ch] text-ink">{note}</p> : null}
    </section>
  );
}
