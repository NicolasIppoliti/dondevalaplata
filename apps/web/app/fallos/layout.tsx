import { SectionTabs } from "@/components/SectionTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { TRANSPARENCIA_TABS } from "@/lib/nav";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment). Applies to `/fallos` AND `/fallos/[ejercicio]`
 * via Next.js layout nesting -- both are "Multas del Tribunal de Cuentas".
 *
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): also
 * renders the SAME Transparencia `SectionTabs` bar as
 * `app/transparencia/layout.tsx` (the "Multas del Tribunal" tab points
 * here) -- `/fallos` and `/fallos/[ejercicio]` stay canonical, unchanged,
 * independently reachable routes; this is purely a cross-link widget
 * layered on top.
 */
export default function FallosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/fallos" />
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
