import Link from "next/link";
import { StickyHeaderShell } from "@/components/StickyHeaderShell";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/coparticipacion", label: "Coparticipación" },
  { href: "/fallos", label: "Multas del Tribunal de Cuentas" },
  { href: "/transparencia", label: "Transparencia" },
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
          className="font-display text-[clamp(20px,3vw,28px)] font-bold tracking-tight text-ink no-underline first-letter:text-stamp hover:text-ink"
        >
          ¿Dónde va la plata?
          <span className="sr-only"> — Coronel Rosales</span>
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
