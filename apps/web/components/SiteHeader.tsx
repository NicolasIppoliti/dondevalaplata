import Link from "next/link";

const NAV_ITEMS = [
  { href: "/coparticipacion", label: "Coparticipación" },
  { href: "/fallos", label: "Multas del Tribunal de Cuentas" },
  { href: "/fuentes", label: "Fuentes" },
  { href: "/acerca", label: "Acerca de" },
] as const;

/**
 * Newspaper masthead (DESIGN.md "Navegación"): 2-3px ink bottom rule, brand
 * wordmark in Fraunces with a stamp-red opening "¿" (via `::first-letter`,
 * not a wrapping span -- splitting the brand text across elements breaks
 * `getByText("¿Dónde va la plata?")` in the rebrand invariant test, since
 * Testing Library matches an element's OWN direct text nodes, not its full
 * recursive `textContent`). The brand link itself has no underline: it is
 * a wordmark, not a body-copy link.
 */
export function SiteHeader() {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-5 py-6">
        <Link
          href="/"
          className="font-display text-[clamp(20px,3vw,28px)] font-bold tracking-tight text-ink no-underline first-letter:text-stamp hover:text-ink"
        >
          ¿Dónde va la plata?
          <span className="sr-only"> — Coronel Rosales</span>
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
