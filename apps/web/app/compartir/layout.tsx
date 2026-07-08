import { SiteHeader } from "@/components/SiteHeader";

/**
 * Renders the shared masthead. `/compartir/[fact]` is not one of the
 * primary nav sections (see DESIGN.md's nav item list), so no item is
 * highlighted -- same `activeHref={null}` pattern the home page uses.
 */
export default function CompartirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader activeHref={null} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
      >
        {children}
      </main>
    </>
  );
}
