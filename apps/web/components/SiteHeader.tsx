import Link from "next/link";
import { StickyHeaderShell } from "@/components/StickyHeaderShell";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/coparticipacion", label: "Coparticipación" },
  { href: "/gastos", label: "Gastos" },
  { href: "/adjudicaciones", label: "Adjudicaciones" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/fallos", label: "Multas del Tribunal de Cuentas" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/fuentes", label: "Fuentes" },
  { href: "/acerca", label: "Acerca de" },
] as const;

/**
 * Newspaper masthead (DESIGN.md "Navegación"), evolved for the "dashboard
 * cívico premium" fidelity pass (Mockup A, F1) with a square logo badge +
 * a locality subtitle under the wordmark. Brand wordmark stays in Fraunces
 * with a stamp-red opening "¿" (via `::first-letter`, not a wrapping span
 * -- splitting the brand text across elements breaks
 * `getByText("¿Dónde va la plata?")` in the rebrand invariant test, since
 * Testing Library matches an element's OWN direct text nodes, not its full
 * recursive `textContent`). The whole brand block is one link with an
 * explicit `aria-label` carrying the full accessible name (badge + wordmark
 * + subtitle read as one unit, "$" marked `aria-hidden`) -- no underline:
 * it is a wordmark, not a body-copy link.
 *
 * `activeHref` highlights the current section's nav item. This is threaded
 * in as a plain prop (from each top-level route's own `layout.tsx`, see
 * `app/coparticipacion/layout.tsx` etc.) rather than read via
 * `usePathname()` -- that would force this into a Client Component for a
 * cosmetic nav highlight, working against the site's zero-JS doctrine, AND
 * `usePathname()` throws outside a mounted Next.js router, which is
 * exactly how `rebrand.test.tsx` renders `<SiteHeader />` directly today.
 *
 * The inline nav (`hidden sm:flex`) is desktop-only: mobile gets the
 * sticky bottom tab bar instead (`components/MobileBottomNav.tsx`, wired
 * in `app/layout.tsx`). `StickyHeaderShell` (a small client island) owns
 * the sticky positioning + scroll shadow; everything else here stays a
 * plain server component.
 */
export function SiteHeader({
  activeHref = null,
}: {
  activeHref?: string | null;
}) {
  return (
    <StickyHeaderShell>
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 no-underline"
          aria-label="¿Dónde va la plata? — Coronel Rosales, inicio"
        >
          <span
            aria-hidden="true"
            className="grid h-[38px] w-[38px] flex-none place-items-center rounded-sm bg-ink font-mono text-xl leading-none font-semibold text-surface"
          >
            $
          </span>
          <span className="flex flex-col leading-[1.15]">
            <strong className="font-display text-[17px] font-bold tracking-tight text-ink not-italic first-letter:text-stamp">
              ¿Dónde va la plata?
            </strong>
            <small className="font-mono text-xs text-muted not-italic">
              Coronel Rosales · Punta Alta
            </small>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden sm:block">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "font-semibold text-stamp decoration-2"
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </StickyHeaderShell>
  );
}
