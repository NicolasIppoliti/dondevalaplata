import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"):
 * Fuentes and Acerca de move out of SiteHeader's primary nav (now 4 doors
 * only, see rebrand.test.tsx) into the footer as real, visible nav links --
 * not just the pre-existing "declaración de neutralidad" prose mention, so
 * both routes stay a real one-tap destination from every page.
 */
describe("SiteFooter — Fuentes/Acerca de links", () => {
  it("renders a footer nav landmark with links to /fuentes and /acerca", () => {
    render(<SiteFooter />);
    const nav = screen.getByRole("navigation", { name: /pie de p[aá]gina/i });
    const fuentes = within(nav).getByRole("link", { name: "Fuentes" });
    expect(fuentes.getAttribute("href")).toBe("/fuentes");
    const acerca = within(nav).getByRole("link", { name: "Acerca de" });
    expect(acerca.getAttribute("href")).toBe("/acerca");
  });

  it("attributes the portal to Fragua in the footer copy", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/fragua/i)).toBeTruthy();
  });
});
