import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const { MobileBottomNav } = await import("@/components/MobileBottomNav");

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): the
 * mobile bottom tab bar shrinks from 8 tabs to exactly 5 -- Inicio + the 4
 * primary doors (Coparticipación, Gastos, Transparencia, Pedidos) -- fixing
 * the fragility of an 8-column `grid` at 390px. Compras/Multas/Novedades no
 * longer get their own bottom-nav tab; they fold into Gastos/Transparencia
 * the same way they fold into SiteHeader's primary nav (see rebrand.test.tsx
 * "SiteHeader — consolidated 4-door nav").
 */
describe("MobileBottomNav", () => {
  it("renders a navigation landmark with exactly the 5 consolidated mobile tabs", () => {
    usePathnameMock.mockReturnValue("/");
    render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation", {
      name: /navegaci[oó]n principal/i,
    });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Inicio",
      "Plata",
      "Gastos",
      "Transparencia",
      "Pedidos",
    ]);
  });

  it("no longer renders separate Compras, Multas or Novedades tabs", () => {
    usePathnameMock.mockReturnValue("/");
    render(<MobileBottomNav />);
    expect(screen.queryByRole("link", { name: "Compras" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Multas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Novedades" })).toBeNull();
  });

  it("marks the matching tab aria-current='page' for the current pathname", () => {
    usePathnameMock.mockReturnValue("/coparticipacion");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Plata" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Inicio" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Inicio active only on the exact root path, not every path", () => {
    usePathnameMock.mockReturnValue("/fallos");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Inicio" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Gastos active on /gastos (feature G2)", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Plata" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Gastos active on /adjudicaciones (adjudicaciones is now a Gastos tab)", () => {
    usePathnameMock.mockReturnValue("/adjudicaciones");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks Gastos active on /gastos/cumplen (the presupuesto vs. ejecución tab)", () => {
    usePathnameMock.mockReturnValue("/gastos/cumplen");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks Pedidos active on /pedidos (feature G4)", () => {
    usePathnameMock.mockReturnValue("/pedidos");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Pedidos" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Transparencia active on /transparencia", () => {
    usePathnameMock.mockReturnValue("/transparencia");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks Transparencia active on /novedades (novedades is now a Transparencia tab)", () => {
    usePathnameMock.mockReturnValue("/novedades");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks Transparencia active on /fallos and on a fallo detail route (fallos is now a Transparencia tab)", () => {
    usePathnameMock.mockReturnValue("/fallos");
    const { unmount } = render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
    unmount();

    usePathnameMock.mockReturnValue("/fallos/2023");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});
