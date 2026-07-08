/**
 * "Cómo leer los colores" explainer (Direction C graft, DESIGN.md
 * "Componentes canónicos"). Reusable, static, server-rendered -- no
 * interactivity needed, so it costs zero client JS. States the INVIOLABLE
 * neutrality rule: green/red mark arithmetic variation of ONE series only,
 * always paired with a ▲/▼ marker (never color alone, WCAG 1.4.1), and
 * never a judgment on an administración/gestión or party. Meant to be
 * dropped next to any chart/table/score across the site.
 *
 * `headingLevel` (default `"h3"`) lets the caller keep a valid, strictly
 * sequential heading order: on `/coparticipacion` this component sits
 * after an existing h1->h2 chain, so the default h3 is correct there, but
 * on the home hero it is the first content heading after the page's
 * (sr-only) h1 -- with no h2 above it yet -- so home passes `"h2"`
 * explicitly (a real Lighthouse "heading-order" failure otherwise).
 */
export function ColorLegend({
  className,
  headingLevel = "h3",
}: {
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <aside
      aria-label="Cómo leer los colores"
      role="region"
      className={`rounded-lg border border-rule bg-surface p-5 shadow-card ${className ?? ""}`}
    >
      <Heading className="font-display text-base font-semibold text-ink">
        Cómo leer los colores
      </Heading>
      <ul className="mt-3 space-y-2 text-sm text-ink-2">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-6 flex-none rounded-full bg-olive"
          />
          <span>
            <span aria-hidden="true" className="font-semibold text-olive">
              ▲
            </span>{" "}
            Sube respecto del período anterior
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-6 flex-none rounded-full bg-stamp"
          />
          <span>
            <span aria-hidden="true" className="font-semibold text-stamp">
              ▼
            </span>{" "}
            Cae respecto del período anterior
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-6 flex-none rounded-full bg-ocre"
          />
          <span>
            Resalte documental (multas, ítems pendientes) — resalta, no juzga
          </span>
        </li>
      </ul>
      <p className="mt-3 text-sm text-ink-2">
        El verde y el rojo <strong>solo</strong> marcan si un número subió o
        bajó respecto del período anterior, siempre junto a una marca ▲/▼ —
        nunca color solo. <strong>Nunca opinan</strong> sobre una gestión o un
        partido.
      </p>
    </aside>
  );
}
