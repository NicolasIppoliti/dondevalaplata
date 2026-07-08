"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Inicio",
    icon: <path d="M3 9.5 12 3l9 6.5M5 10v10h14V10M9 20v-6h6v6" />,
  },
  {
    href: "/coparticipacion",
    label: "Plata",
    icon: (
      <path d="M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 12h.01M18 12h.01" />
    ),
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: (
      <path d="M4 19h16M6 19V9l6-4 6 4v10M9 19v-6h6v6" />
    ),
  },
  {
    href: "/fallos",
    label: "Multas",
    icon: (
      <path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10m5 6 6-6M8 8l6-6M9 7l8 8M21 11l-8-8" />
    ),
  },
  {
    href: "/transparencia",
    label: "Transparencia",
    icon: (
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zm-11-1 2 2 4-4" />
    ),
  },
] as const;

/**
 * Mobile sticky bottom tab bar (Direction C graft, DESIGN.md app shell).
 * Hidden from `sm` up, where the desktop sticky header's inline nav takes
 * over (`hidden sm:flex` there, `sm:hidden` here -- exactly one nav
 * landmark is ever exposed to the accessibility tree at a time, per
 * viewport). Active tab uses `usePathname()`: this is a small, genuinely
 * interactive client island (unlike SiteHeader's route-threaded
 * `activeHref`, which stays server-rendered/zero-JS on purpose) -- the
 * redesign explicitly allows small client islands for exactly this kind of
 * always-visible, always-mounted chrome. `aria-current="page"` (never
 * color alone) marks the active tab.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-header backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold no-underline ${
                  isActive ? "text-stamp" : "text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {tab.icon}
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
