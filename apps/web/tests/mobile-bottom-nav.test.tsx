import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const { MobileBottomNav } = await import("@/components/MobileBottomNav");

afterEach(() => {
  vi.clearAllMocks();
});

describe("MobileBottomNav", () => {
  it("renders a navigation landmark with the 6 mobile tabs (feature G3 added Compras)", () => {
    usePathnameMock.mockReturnValue("/");
    render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation", {
      name: /navegaci[oó]n principal/i,
    });
    expect(nav).toBeTruthy();
    expect(screen.getByRole("link", { name: "Inicio" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Plata" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gastos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Compras" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Multas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Transparencia" })).toBeTruthy();
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
    expect(
      screen.getByRole("link", { name: "Multas" }).getAttribute("aria-current"),
    ).toBe("page");
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

  it("marks Compras active on /adjudicaciones (feature G3)", () => {
    usePathnameMock.mockReturnValue("/adjudicaciones");
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("link", { name: "Compras" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
