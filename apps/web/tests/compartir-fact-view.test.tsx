import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CompartirFactView } from "@/components/compartir/CompartirFactView";
import { getShareFact } from "@/lib/shareFacts";

/**
 * Feature H3b: kept as a plain, synchronous, presentational component (same
 * container/presentational split as `FalloEjercicioView`) so it can be
 * unit-tested directly, independent of the async `params` Promise the real
 * `app/compartir/[fact]/page.tsx` route must await per Next.js 16.
 */
describe("CompartirFactView", () => {
  it("renders the fact's headline, value and caption for each known fact id", () => {
    for (const factId of ["deuda", "transparencia", "coparticipacion"]) {
      const fact = getShareFact(factId);
      const { container, unmount } = render(
        <CompartirFactView factId={factId} />,
      );
      expect(
        within(container).getByRole("heading", { level: 1 }).textContent,
      ).toBe(fact?.headline);
      expect(container.textContent).toContain(fact?.value);
      expect(container.textContent).toContain(fact?.caption);
      unmount();
    }
  });

  it("cites full dual-link + sha256 provenance (INVIOLABLE #2) via SourcesFooter", () => {
    render(<CompartirFactView factId="deuda" />);
    expect(screen.getByText("Fuentes y procedencia")).toBeTruthy();
    expect(screen.getAllByText(/sha256/).length).toBeGreaterThan(0);
  });

  it("links back to the fact's full page on the site", () => {
    const fact = getShareFact("coparticipacion");
    render(<CompartirFactView factId="coparticipacion" />);
    const backLink = screen.getByRole("link", {
      name: /ver la p[aá]gina completa/i,
    });
    expect(backLink.getAttribute("href")).toBe(fact?.pageHref);
  });

  it("offers a Compartir button so a visitor can re-share the same fact", () => {
    render(<CompartirFactView factId="transparencia" />);
    expect(
      screen.getByRole("button", { name: /compartir/i }),
    ).toBeTruthy();
  });

  it("states the site URL somewhere on the page (factual attribution, not a bare figure)", () => {
    render(<CompartirFactView factId="deuda" />);
    expect(
      screen.getByText(/dondevalaplata\.vercel\.app/),
    ).toBeTruthy();
  });
});
