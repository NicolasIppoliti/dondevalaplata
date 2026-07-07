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
      className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600"
    >
      <h2 id="fuentes-heading" className="font-semibold text-slate-800">
        Fuentes y procedencia
      </h2>
      <ul className="mt-3 space-y-4">
        {links.map((link) => (
          <li key={link.id}>
            <p className="text-slate-800">{link.source}</p>
            <p className="flex flex-wrap gap-x-2">
              <a
                href={link.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Fuente original
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
              <span aria-hidden="true">·</span>
              {link.archivedUrl ? (
                <a
                  href={link.archivedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
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
            </p>
            <p className="text-xs text-slate-500">
              sha256 {shortHash(link.sha256)} · archivado el{" "}
              {formatDateEsAr(link.fetchedAt.slice(0, 10))}
            </p>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-4 text-slate-700">{note}</p> : null}
    </section>
  );
}
