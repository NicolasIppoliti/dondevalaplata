import { SiteHeader } from "@/components/SiteHeader";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment).
 */
export default function AcercaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref="/acerca" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        {children}
      </main>
    </>
  );
}
