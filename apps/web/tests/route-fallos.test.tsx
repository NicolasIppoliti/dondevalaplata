import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import { FalloEjercicioView } from "@/components/fallos/FalloEjercicioView";

const FIELD_LABELS = [
  "Expediente",
  "Fecha del fallo",
  "Gestión",
  "Funcionario/a",
  "Cargo",
  "Multa",
  "Estado del documento",
];

describe("FalloEjercicioView neutrality invariant (htc-fallos)", () => {
  it("renders the identical field set for every record, in 2023 and in 2024", () => {
    const { container: c2023 } = render(<FalloEjercicioView ejercicio="2023" />);
    for (const label of FIELD_LABELS) {
      expect(within(c2023).getAllByText(label).length).toBeGreaterThan(0);
    }

    const { container: c2024 } = render(<FalloEjercicioView ejercicio="2024" />);
    for (const label of FIELD_LABELS) {
      expect(within(c2024).getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("repeats the field labels once per record within an ejercicio (2023 has 3 records)", () => {
    const { container } = render(<FalloEjercicioView ejercicio="2023" />);
    expect(within(container).getAllByText("Expediente")).toHaveLength(3);
    expect(within(container).getAllByText("Multa")).toHaveLength(3);
  });

  it("2022 (scanned, no text layer) uses the SAME field set as 2023/2024", () => {
    const { container } = render(<FalloEjercicioView ejercicio="2022" />);
    for (const label of FIELD_LABELS) {
      expect(within(container).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(container.textContent).toContain(
      "Documento escaneado, texto no extraído",
    );
  });

  it("2023/2024 (text layer available) shows the extracted-text marker instead", () => {
    const { container } = render(<FalloEjercicioView ejercicio="2023" />);
    expect(container.textContent).toContain(
      "Texto extraído del PDF original",
    );
    expect(container.textContent).not.toContain(
      "Documento escaneado, texto no extraído",
    );
  });

  it("never uses editorial adjectives -- cited facts only", () => {
    const { container } = render(<FalloEjercicioView ejercicio="2023" />);
    const forbidden = ["escándalo", "corrupto", "lamentable", "grave"];
    const text = container.textContent?.toLowerCase() ?? "";
    for (const word of forbidden) {
      expect(text).not.toContain(word);
    }
  });
});
