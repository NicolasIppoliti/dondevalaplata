import { SiteHeader } from "@/components/SiteHeader";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment on why active-nav highlighting lives in a
 * per-section layout instead of a client hook or context).
 */
export default function CoparticipacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/coparticipacion" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        {children}
      </main>
    </>
  );
}
