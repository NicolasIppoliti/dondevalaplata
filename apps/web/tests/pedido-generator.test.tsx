import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PedidoGenerator } from "@/components/pedidos/PedidoGenerator";

/**
 * Feature G4: the pedido generator's only client island. Covers: the live
 * preview reflecting form state (via the already-unit-tested
 * `generatePedidoText`), preset-driven field visibility, the copy/download/
 * print actions, and the "nothing leaves your browser" disclosure.
 */
describe("PedidoGenerator", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.stubGlobal("print", vi.fn());
    if (!URL.createObjectURL) {
      Object.assign(URL, { createObjectURL: () => "blob:mock" });
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders every required Art. 6 field plus the objeto/destinatario selects", () => {
    render(<PedidoGenerator />);
    expect(screen.getByLabelText(/qué querés pedir/i)).toBeTruthy();
    expect(screen.getByLabelText(/a quién se lo pedís/i)).toBeTruthy();
    expect(screen.getByLabelText(/^nombre y apellido$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^dni$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^domicilio real$/i)).toBeTruthy();
    expect(screen.getByLabelText(/domicilio constituido/i)).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
  });

  it("shows the periodo field for the default 'detalle-gastos' preset", () => {
    render(<PedidoGenerator />);
    expect(screen.getByLabelText(/período/i)).toBeTruthy();
  });

  it("hides the periodo field and shows nothing extra for the padrón preset", () => {
    render(<PedidoGenerator />);
    fireEvent.change(screen.getByLabelText(/qué querés pedir/i), {
      target: { value: "padron-proveedores" },
    });
    expect(screen.queryByLabelText(/período/i)).toBeNull();
  });

  it("shows a free-text textarea for the 'personalizado' preset", () => {
    render(<PedidoGenerator />);
    fireEvent.change(screen.getByLabelText(/qué querés pedir/i), {
      target: { value: "personalizado" },
    });
    expect(screen.getByLabelText(/redactá qué información pedís/i)).toBeTruthy();
  });

  it("renders a live preview that reflects typed form data, citing Ordenanza 3638", async () => {
    render(<PedidoGenerator />);
    fireEvent.change(screen.getByLabelText(/^nombre y apellido$/i), {
      target: { value: "Juana Pérez" },
    });
    const preview = await screen.findByText(/Ordenanza N° 3638/);
    expect(preview.textContent).toContain("Juana Pérez");
  });

  it("discloses that nothing typed here is sent to any server", () => {
    render(<PedidoGenerator />);
    expect(
      screen.getByText(/se envía a ningún servidor/i),
    ).toBeTruthy();
  });

  it("shows the 'cómo presentarlo' guidance (sello, cargo, expediente)", () => {
    render(<PedidoGenerator />);
    const text = document.body.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/sell/);
    expect(text).toMatch(/cargo/);
    expect(text).toMatch(/expediente/);
  });

  it("copies the current letter text to the clipboard when 'Copiar' is clicked", async () => {
    render(<PedidoGenerator />);
    await screen.findByText(/Ordenanza N° 3638/);
    fireEvent.click(screen.getByRole("button", { name: /^copiar$/i }));
    await screen.findByText("Copiado ✓");
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const copiedText = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(copiedText).toContain("Ordenanza N° 3638");
  });

  it("triggers a .txt download when 'Descargar .txt' is clicked", async () => {
    render(<PedidoGenerator />);
    await screen.findByText(/Ordenanza N° 3638/);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: /descargar \.txt/i }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("calls window.print when 'Imprimir' is clicked", async () => {
    render(<PedidoGenerator />);
    await screen.findByText(/Ordenanza N° 3638/);
    fireEvent.click(screen.getByRole("button", { name: /imprimir/i }));
    expect(window.print).toHaveBeenCalledOnce();
  });

  it("disables the action buttons before the letter preview is ready", () => {
    render(<PedidoGenerator />);
    expect(
      screen.getByRole("button", { name: /^copiar$/i }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: /descargar \.txt/i }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: /imprimir/i }),
    ).toHaveProperty("disabled", true);
  });
});
