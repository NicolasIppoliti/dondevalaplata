import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PedidosTracker } from "@/components/pedidos/PedidosTracker";
import type { PedidoRecord } from "@/lib/schemas";

/**
 * Feature G4: the data-driven pedidos tracker. `vi.setSystemTime` fixes
 * "today" to a known date so the live plazo computation (post-mount, see
 * the component's own docstring) is deterministic in tests.
 */
describe("PedidosTracker", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 6, 8)); // 2026-07-08
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an honest empty state when there are no pedidos yet", () => {
    render(<PedidosTracker pedidos={[]} />);
    expect(screen.getByText(/todavía no se present/i)).toBeTruthy();
  });

  it("renders the pedido's stored facts: objeto, fecha presentado, expediente, estado", () => {
    const pedido: PedidoRecord = {
      objeto: "Padrón de proveedores",
      fechaPresentado: "2026-06-25",
      expediente: "BBC-050/26",
      estado: "presentado",
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    expect(screen.getByText("Padrón de proveedores")).toBeTruthy();
    expect(screen.getByText("BBC-050/26")).toBeTruthy();
    expect(screen.getByText("Presentado")).toBeTruthy();
  });

  it("shows a neutral placeholder for the plazo readout before mount computes it", () => {
    const pedido: PedidoRecord = {
      objeto: "Padrón de proveedores",
      fechaPresentado: "2026-06-25",
      expediente: "BBC-050/26",
      estado: "presentado",
    };
    const { container } = render(<PedidosTracker pedidos={[pedido]} />);
    expect(container.textContent).toMatch(/calculando/i);
  });

  it("shows days-elapsed and days-remaining for a pedido still within the plazo", async () => {
    const pedido: PedidoRecord = {
      objeto: "Padrón de proveedores",
      fechaPresentado: "2026-06-25", // 9 días hábiles hasta 2026-07-08
      expediente: "BBC-050/26",
      estado: "presentado",
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    const status = await screen.findByText(/quedan \d+ para el vencimiento/i);
    expect(status.textContent).toContain("9");
    expect(status.textContent).toContain("30");
  });

  it("shows the overdue banner + next-step guidance once elapsed business days exceed 30", async () => {
    const pedido: PedidoRecord = {
      objeto: "Detalle de ejecución de gastos del 1er trimestre 2026",
      fechaPresentado: "2026-04-01", // 70 días hábiles hasta 2026-07-08
      expediente: "BBC-100/26",
      estado: "presentado",
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    const banner = await screen.findByText(/supera el plazo del art\. 8/i);
    expect(banner.textContent).toContain("70");
    expect(
      screen.getByText(/pronto despacho/i),
    ).toBeTruthy();
    expect(screen.getByText(/amparo por mora/i)).toBeTruthy();
  });

  it("freezes the plazo readout at fechaRespuesta for a respondido pedido, never counting further", async () => {
    const pedido: PedidoRecord = {
      objeto: "Escala salarial y gastos de personal",
      fechaPresentado: "2026-04-01",
      expediente: "BBC-090/26",
      estado: "respondido",
      fechaRespuesta: "2026-05-15", // 32 días hábiles
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    const status = await screen.findByText(/respondido a los/i);
    expect(status.textContent).toContain("32");
  });

  it("links to the respuestaUrl when present", () => {
    const pedido: PedidoRecord = {
      objeto: "Escala salarial y gastos de personal",
      fechaPresentado: "2026-04-01",
      expediente: "BBC-090/26",
      estado: "respondido",
      fechaRespuesta: "2026-05-15",
      respuestaUrl: "https://example.com/respuesta.pdf",
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    const link = screen.getByRole("link", { name: /ver la respuesta/i });
    expect(link.getAttribute("href")).toBe("https://example.com/respuesta.pdf");
  });

  it("shows notas when present", () => {
    const pedido: PedidoRecord = {
      objeto: "Padrón de proveedores",
      fechaPresentado: "2026-06-25",
      expediente: "BBC-050/26",
      estado: "presentado",
      notas: "Nota de ejemplo para test",
    };
    render(<PedidosTracker pedidos={[pedido]} />);
    expect(screen.getByText("Nota de ejemplo para test")).toBeTruthy();
  });
});
