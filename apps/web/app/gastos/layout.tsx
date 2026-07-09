import { SectionTabs } from "@/components/SectionTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { GASTOS_TABS } from "@/lib/nav";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment on why active-nav highlighting lives in a
 * per-section layout instead of a client hook or context).
 *
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): also
 * renders the Gastos `SectionTabs` bar. This layout wraps BOTH `/gastos`
 * (Next's nested-layout inheritance) AND `/gastos/cumplen` -- the third
 * tab, `/adjudicaciones`, is a sibling top-level route with its own
 * `layout.tsx` rendering the SAME `GASTOS_TABS` bar (see
 * `app/adjudicaciones/layout.tsx`), never a duplicated tab list.
 */
export default function GastosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/gastos" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        <div className="mb-8">
          <SectionTabs tabs={GASTOS_TABS} label="Gastos" />
        </div>
        {children}
      </main>
    </>
  );
}
