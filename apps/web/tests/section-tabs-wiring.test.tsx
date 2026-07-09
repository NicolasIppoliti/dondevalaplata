import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const { default: GastosLayout } = await import("@/app/gastos/layout");
const { default: AdjudicacionesLayout } = await import(
  "@/app/adjudicaciones/layout"
);
const { default: TransparenciaLayout } = await import(
  "@/app/transparencia/layout"
);
const { default: NovedadesLayout } = await import("@/app/novedades/layout");
const { default: FallosLayout } = await import("@/app/fallos/layout");

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"): every
 * route folded into a tabbed door renders the SAME `SectionTabs` bar
 * (`lib/nav.ts`'s `GASTOS_TABS`/`TRANSPARENCIA_TABS`) via its own
 * `layout.tsx`, so the tab bar is visible and correctly highlights the
 * current tab no matter which of the door's sibling routes the visitor
 * actually landed on.
 */
describe("Gastos door — SectionTabs wired into all 3 sibling layouts", () => {
  it("app/gastos/layout.tsx renders the Gastos tablist with 'Por partida' selected on /gastos", () => {
    usePathnameMock.mockReturnValue("/gastos");
    render(<GastosLayout>contenido</GastosLayout>);
    const tablist = screen.getByRole("tablist", { name: "Gastos" });
    expect(tablist).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Por partida" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("app/gastos/layout.tsx (inherited by /gastos/cumplen) selects the 'cumplen' tab there", () => {
    usePathnameMock.mockReturnValue("/gastos/cumplen");
    render(<GastosLayout>contenido</GastosLayout>);
    expect(
      screen
        .getByRole("tab", { name: "¿Cumplen lo que prometieron?" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("app/adjudicaciones/layout.tsx renders the SAME Gastos tablist with the 3rd tab selected", () => {
    usePathnameMock.mockReturnValue("/adjudicaciones");
    render(<AdjudicacionesLayout>contenido</AdjudicacionesLayout>);
    const tablist = screen.getByRole("tablist", { name: "Gastos" });
    expect(tablist).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "¿A quién le compró?" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Por partida" }).getAttribute("aria-selected"),
    ).toBe("false");
  });
});

describe("Transparencia door — SectionTabs wired into all 3 sibling layouts", () => {
  it("app/transparencia/layout.tsx renders the Transparencia tablist with 'Índice y deuda' selected", () => {
    usePathnameMock.mockReturnValue("/transparencia");
    render(<TransparenciaLayout>contenido</TransparenciaLayout>);
    const tablist = screen.getByRole("tablist", { name: "Transparencia" });
    expect(tablist).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Índice y deuda" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("app/novedades/layout.tsx renders the SAME Transparencia tablist with 'Novedades' selected", () => {
    usePathnameMock.mockReturnValue("/novedades");
    render(<NovedadesLayout>contenido</NovedadesLayout>);
    expect(
      screen.getByRole("tab", { name: "Novedades" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Índice y deuda" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("app/fallos/layout.tsx (inherited by /fallos/[ejercicio]) renders the SAME Transparencia tablist with 'Multas del Tribunal' selected", () => {
    usePathnameMock.mockReturnValue("/fallos/2023");
    render(<FallosLayout>contenido</FallosLayout>);
    expect(
      screen.getByRole("tab", { name: "Multas del Tribunal" }).getAttribute("aria-selected"),
    ).toBe("true");
  });
});
