/**
 * IA consolidation ("4 puertas"): shared tab configs for the two "doors"
 * that fold multiple pre-existing routes into a single tabbed section
 * (Gastos, Transparencia). Each entry's `href` is a real, independently
 * prerendered Next.js route -- there is no client-only panel switcher and
 * no query-param/hash-driven single-route tab state, on purpose: this repo
 * is 100% build-time/static (DESIGN.md INVIOLABLE #4) and every pre-existing
 * URL (`/adjudicaciones`, `/novedades`, `/fallos`, `/fallos/[ejercicio]`)
 * must keep resolving exactly as it did before this consolidation. Reading
 * `searchParams` in a page (the alternative "?tab=" mechanism) would opt
 * that route out of static generation in the Next.js App Router, which
 * this project cannot accept.
 *
 * These configs are consumed by `components/SectionTabs.tsx` (the tablist
 * UI) from MULTIPLE sibling `layout.tsx` files -- one config, one canonical
 * label set, never re-typed per route.
 */
export type SectionTabConfig = {
  href: string;
  label: string;
};

/**
 * Gastos ("¿En qué se va?"): the gasto-por-partida explorer (G2), the
 * presupuesto-vs-ejecución comparison (H1, its own route as of this
 * consolidation), the "¿Cuánto se va en sueldos?" personnel-spend
 * aggregation (its own route, `lib/personal.ts`), and the SIBOM
 * adjudicaciones monitor (G3, unchanged route, kept canonical).
 */
export const GASTOS_TABS: SectionTabConfig[] = [
  { href: "/gastos", label: "Por partida" },
  { href: "/gastos/cumplen", label: "¿Cumplen lo que prometieron?" },
  { href: "/gastos/sueldos", label: "¿Cuánto se va en sueldos?" },
  { href: "/adjudicaciones", label: "¿A quién le compró?" },
];

/**
 * Transparencia ("¿Se puede confiar?"): the ASAP index + deuda dashboard
 * (unchanged route), the novedades watchdog feed (unchanged route), and
 * the Tribunal de Cuentas fallos index + detail (unchanged routes, kept
 * canonical).
 */
export const TRANSPARENCIA_TABS: SectionTabConfig[] = [
  { href: "/transparencia", label: "Índice y deuda" },
  { href: "/novedades", label: "Novedades" },
  { href: "/fallos", label: "Multas del Tribunal" },
];
