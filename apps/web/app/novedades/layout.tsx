import { SectionTabs } from "@/components/SectionTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { TRANSPARENCIA_TABS } from "@/lib/nav";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment on why active-nav highlighting lives in a
 * per-section layout instead of a client hook or context).
 *
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): also
 * renders the SAME Transparencia `SectionTabs` bar as
 * `app/transparencia/layout.tsx` (the "Novedades" tab points here) --
 * `/novedades` stays a canonical, unchanged, independently reachable
 * route; this is purely a cross-link widget layered on top.
 */
export default function NovedadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/novedades" />
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
