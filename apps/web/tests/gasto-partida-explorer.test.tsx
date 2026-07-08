import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { GastoPartidaJurisdiccion } from "@/lib/schemas";
import { GastoPartidaExplorer } from "@/components/gasto-partida/GastoPartidaExplorer";

const TREE: GastoPartidaJurisdiccion[] = [
  {
    code: "1110101000",
    name: "Conducción Superior",
    programas: [
      {
        code: "01.00.00",
        name: "Coordinación y gestión de políticas centrales",
        objetos: [
          {
            code: "1.1.1.0",
            name: "Retribuciones del cargo",
            vigenteArs: 200_000_000,
            devengadoArs: 100_000_000,
            pagadoArs: 80_000_000,
            verified: true,
          },
          {
            code: "2.5.6.0",
            name: "Combustibles y lubricantes",
            vigenteArs: 4_000_000,
            devengadoArs: 103_739_038.23,
            pagadoArs: 103_739_038.23,
            verified: false,
          },
        ],
      },
    ],
  },
  {
    code: "1120000000",
    name: "Secretaría de Hacienda",
    programas: [
      {
        code: "02.00.00",
        name: "Administración financiera",
        objetos: [
          {
            code: "3.4.9.0",
            name: "Otros servicios técnicos y profesionales",
            vigenteArs: 1_700_000,
            devengadoArs: 0,
            pagadoArs: 0,
            verified: true,
          },
        ],
      },
    ],
  },
];

describe("GastoPartidaExplorer", () => {
  it("renders a search box and every jurisdicción collapsed by default", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);

    expect(
      screen.getByRole("searchbox", { name: /buscar partida/i }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /Conducción Superior/i })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: /Secretaría de Hacienda/i })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    // Collapsed: no objeto-level content rendered yet.
    expect(screen.queryByText("Retribuciones del cargo")).toBeNull();
  });

  it("expands a jurisdicción to reveal its programas, then a programa to reveal objetos", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Conducción Superior/i }),
    );
    const programaButton = screen.getByRole("button", {
      name: /Coordinación y gestión de políticas centrales/i,
    });
    expect(programaButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(programaButton);
    expect(screen.getByText("Retribuciones del cargo")).toBeTruthy();
    expect(screen.getByText("Combustibles y lubricantes")).toBeTruthy();
  });

  it("formats objeto amounts es-AR human-rounded, with the exact figure available on hover via title", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Conducción Superior/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Coordinación y gestión de políticas centrales/i,
      }),
    );

    const row = screen.getByText("Retribuciones del cargo").closest("li")!;
    // formatArsHuman(100_000_000) -> "$ 100 millones"
    const devengadoEl = within(row).getByText("$ 100 millones");
    expect(devengadoEl.getAttribute("title")).toBe("$ 100.000.000");
  });

  it("shows a neutral % ejecutado (never colored green/red -- a ratio within one period, not a time-series variation)", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Conducción Superior/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Coordinación y gestión de políticas centrales/i,
      }),
    );

    const row = screen.getByText("Retribuciones del cargo").closest("li")!;
    // 100_000_000 / 200_000_000 = 50%
    expect(within(row).getByText("50% ejecutado")).toBeTruthy();
  });

  it("marks an unverified objeto with an explicit documentary badge, never a fabricated verified state", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Conducción Superior/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Coordinación y gestión de políticas centrales/i,
      }),
    );

    const row = screen.getByText("Combustibles y lubricantes").closest("li")!;
    expect(within(row).getByText(/dato no verificado/i)).toBeTruthy();
  });

  it("search filters to the matching branch and auto-expands it", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /buscar partida/i }), {
      target: { value: "combustible" },
    });

    expect(screen.getByText("Combustibles y lubricantes")).toBeTruthy();
    expect(screen.queryByText("Retribuciones del cargo")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Secretaría de Hacienda/i }),
    ).toBeNull();
  });

  it("shows a no-results message for a query that matches nothing", () => {
    render(<GastoPartidaExplorer jurisdicciones={TREE} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /buscar partida/i }), {
      target: { value: "esta partida no existe en ningún lado" },
    });

    expect(screen.getByText(/no encontramos ninguna partida/i)).toBeTruthy();
  });
});
