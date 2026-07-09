import { SectionTabs } from "@/components/SectionTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { TRANSPARENCIA_TABS } from "@/lib/nav";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment on why active-nav highlighting lives in a
 * per-section layout instead of a client hook or context).
 *
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): also
 * renders the Transparencia `SectionTabs` bar. `/novedades` and `/fallos`
 * (+ `/fallos/[ejercicio]`) are sibling top-level routes with their own
 * `layout.tsx` rendering the SAME `TRANSPARENCIA_TABS` bar (see those
 * files), never a duplicated tab list.
 */
export default function TransparenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/transparencia" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        <div className="mb-8">
          <SectionTabs tabs={TRANSPARENCIA_TABS} label="Transparencia" />
        </div>
        {children}
      </main>
    </>
  );
}
