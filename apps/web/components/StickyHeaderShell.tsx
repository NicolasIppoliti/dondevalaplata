"use client";

import { useEffect, useState } from "react";

/**
 * Thin client wrapper around the `<header>` element itself: sticky
 * positioning + a subtle scroll shadow once the page has actually
 * scrolled (mockup's `.site-head.is-stuck` treatment, ported to a
 * `data-stuck` attribute + Tailwind `data-[stuck=true]:` variants). Kept
 * as its own tiny island so `SiteHeader`'s brand/nav markup (server
 * component, still rendered via each route's own `layout.tsx` -- see that
 * file's comment on why active-nav highlighting stays route-threaded
 * instead of `usePathname()`) stays server-rendered; only the scroll
 * listener itself is client JS.
 */
export function StickyHeaderShell({ children }: { children: React.ReactNode }) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsStuck(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-stuck={isStuck || undefined}
      className="sticky top-0 z-40 border-b border-transparent bg-paper/90 backdrop-blur transition-[box-shadow,border-color] duration-200 supports-[backdrop-filter]:bg-paper/80 data-[stuck]:border-rule data-[stuck]:shadow-header"
    >
      {children}
    </header>
  );
}
