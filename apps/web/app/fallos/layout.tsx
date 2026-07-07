import { SiteHeader } from "@/components/SiteHeader";

/**
 * Renders the shared masthead with this section highlighted (see
 * app/layout.tsx's comment). Applies to `/fallos` AND `/fallos/[ejercicio]`
 * via Next.js layout nesting -- both are "Multas del Tribunal de Cuentas".
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
        {children}
      </main>
    </>
  );
}
