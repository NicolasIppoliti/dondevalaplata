import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const { SectionTabs } = await import("@/components/SectionTabs");

afterEach(() => {
  vi.clearAllMocks();
});

const TABS = [
  { href: "/gastos", label: "Por partida" },
  { href: "/gastos/cumplen", label: "¿Cumplen lo que prometieron?" },
  { href: "/adjudicaciones", label: "¿A quién le compró?" },
];

/**
 * IA consolidation ("4 puertas"): `SectionTabs` is the small client island
 * that renders the cross-page tab bar shared by a "door" section's sibling
 * routes (e.g. Gastos: /gastos, /gastos/cumplen, /adjudicaciones). Each tab
 * IS a real, independently prerendered route (never a client-only panel
 * switch) -- see DESIGN.md's SectionTabs entry for why -- so this component
 * only owns the tablist chrome (ARIA roles, active-state, roving-tabindex
 * keyboard nav), never content visibility.
 */
describe("SectionTabs", () => {
  it("renders a tablist landmark with the given accessible name and one tab per entry", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    const tablist = screen.getByRole("tablist", { name: "Gastos" });
    expect(tablist).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Por partida" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "¿Cumplen lo que prometieron?" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "¿A quién le compró?" })).toBeTruthy();
  });

  it("each tab is a real link pointing at its own route (deep-linkable)", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    expect(
      screen.getByRole("tab", { name: "¿A quién le compró?" }).getAttribute("href"),
    ).toBe("/adjudicaciones");
  });

  it("marks the tab matching the current pathname aria-selected, others not", () => {
    usePathnameMock.mockReturnValue("/gastos/cumplen");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    expect(
      screen
        .getByRole("tab", { name: "¿Cumplen lo que prometieron?" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Por partida" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("uses roving tabindex: only the selected tab is in the default Tab order", () => {
    usePathnameMock.mockReturnValue("/adjudicaciones");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    expect(
      screen.getByRole("tab", { name: "¿A quién le compró?" }).getAttribute("tabindex"),
    ).toBe("0");
    expect(
      screen.getByRole("tab", { name: "Por partida" }).getAttribute("tabindex"),
    ).toBe("-1");
  });

  it("ArrowRight moves DOM focus to the next tab (never navigates by itself)", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    const first = screen.getByRole("tab", { name: "Por partida" });
    const second = screen.getByRole("tab", {
      name: "¿Cumplen lo que prometieron?",
    });
    first.focus();
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(document.activeElement).toBe(second);
  });

  it("ArrowLeft from the first tab wraps focus to the last tab", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    const first = screen.getByRole("tab", { name: "Por partida" });
    const last = screen.getByRole("tab", { name: "¿A quién le compró?" });
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    expect(document.activeElement).toBe(last);
  });

  it("marks a tab active for a nested path under its href (e.g. /fallos/2023 for the /fallos tab)", () => {
    const transparenciaTabs = [
      { href: "/transparencia", label: "Índice y deuda" },
      { href: "/novedades", label: "Novedades" },
      { href: "/fallos", label: "Multas del Tribunal" },
    ];
    usePathnameMock.mockReturnValue("/fallos/2023");
    render(<SectionTabs tabs={transparenciaTabs} label="Transparencia" />);
    expect(
      screen
        .getByRole("tab", { name: "Multas del Tribunal" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Novedades" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("End moves focus straight to the last tab", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<SectionTabs tabs={TABS} label="Gastos" />);
    const first = screen.getByRole("tab", { name: "Por partida" });
    const last = screen.getByRole("tab", { name: "¿A quién le compró?" });
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(document.activeElement).toBe(last);
  });
});
