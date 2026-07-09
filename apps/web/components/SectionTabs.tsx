"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import type { SectionTabConfig } from "@/lib/nav";

/**
 * IA consolidation ("4 puertas"): the tablist chrome shared by a "door"
 * section's sibling routes (see `lib/nav.ts`'s own docstring for why each
 * tab is a real, independently prerendered route rather than a client-only
 * panel switch). This is a small, genuinely interactive client island
 * (`usePathname()`) -- same precedent as `MobileBottomNav`: always-mounted
 * chrome, exactly the kind of small island DESIGN.md's redesign allows.
 *
 * ARIA: `role="tablist"`/`role="tab"` + `aria-selected` + roving tabindex
 * (only the active tab is in the default Tab order; ArrowLeft/ArrowRight/
 * Home/End move DOM focus among the tabs, matching the WAI-ARIA APG "Tabs"
 * pattern's manual-activation variant). There is deliberately NO
 * `role="tabpanel"` here: unlike `AdjudicacionesExplorer`'s own internal
 * tablist (a real in-page panel switch within ONE client island), each tab
 * here navigates to a genuinely separate document/route -- there is no
 * single DOM subtree to label as "the panel". Arrow keys only MOVE FOCUS,
 * never navigate by themselves (matching manual activation): the focused
 * tab is a real `<Link>`, so Enter/Space activate it exactly like any other
 * link, including with JS disabled.
 */
export function SectionTabs({
  tabs,
  label,
}: {
  tabs: SectionTabConfig[];
  label: string;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);

  // Some tabs are nested under another tab's own href (e.g. "/gastos" and
  // "/gastos/cumplen" are sibling tabs, not a parent/child pair) -- a naive
  // prefix match would mark BOTH active on "/gastos/cumplen". Pick the tab
  // whose href is the LONGEST matching prefix (most specific wins), same
  // resolution strategy a router uses for overlapping static routes.
  const activeHref = tabs
    .filter((tab) => pathname === tab.href || pathname?.startsWith(`${tab.href}/`))
    .reduce<string | null>(
      (best, tab) => (best === null || tab.href.length > best.length ? tab.href : best),
      null,
    );

  function isActive(tab: SectionTabConfig): boolean {
    return tab.href === activeHref;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const container = listRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('[role="tab"]'),
    );
    const currentIndex = items.indexOf(
      document.activeElement as HTMLAnchorElement,
    );
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1 border-b border-rule"
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`min-h-11 border-b-2 px-3 py-2 text-[15px] no-underline ${
              active
                ? "border-stamp font-semibold text-stamp"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
