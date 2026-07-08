import { describe, expect, it } from "vitest";
import {
  computePlazoStatus,
  countBusinessDaysBetween,
  PLAZO_HABIL_DIAS,
  summarizePedidos,
} from "@/lib/pedidos";
import type { PedidoRecord } from "@/lib/schemas";

/**
 * Feature G4: pure business-day math for the Ordenanza 3638 Art. 8 plazo
 * (30 días hábiles). Written TDD-first (RED before `lib/pedidos.ts`
 * existed) -- every expected count below was cross-checked with an
 * independent script before this file was written, never back-derived
 * from the implementation.
 */
describe("countBusinessDaysBetween", () => {
  it("returns 0 for the same day", () => {
    expect(countBusinessDaysBetween("2026-07-08", "2026-07-08")).toBe(0);
  });

  it("returns 0 when `to` is before `from`", () => {
    expect(countBusinessDaysBetween("2026-07-08", "2026-07-05")).toBe(0);
  });

  it("counts a single weekday the day after a Wednesday", () => {
    // 2026-07-08 is a Wednesday, 2026-07-09 a Thursday.
    expect(countBusinessDaysBetween("2026-07-08", "2026-07-09")).toBe(1);
  });

  it("skips the weekend between a Friday and the following Monday", () => {
    // 2026-07-10 is a Friday, 2026-07-13 the following Monday: only Monday
    // counts, Saturday/Sunday are excluded.
    expect(countBusinessDaysBetween("2026-07-10", "2026-07-13")).toBe(1);
  });

  it("counts every weekday across a full month, excluding all weekends", () => {
    // June 2026: from Monday 1st to Tuesday 30th -- 4 full weekends
    // (6/7, 13/14, 20/21, 27/28) fall strictly inside the range.
    expect(countBusinessDaysBetween("2026-06-01", "2026-06-30")).toBe(21);
  });

  it("matches an independently cross-checked real span used by the seed example", () => {
    expect(countBusinessDaysBetween("2026-04-01", "2026-07-08")).toBe(70);
    expect(countBusinessDaysBetween("2026-04-01", "2026-05-15")).toBe(32);
  });
});

const BASE_PEDIDO: PedidoRecord = {
  objeto: "Detalle de ejecución de gastos del 1er trimestre 2026",
  fechaPresentado: "2026-04-01",
  expediente: "BBC-100/26",
  estado: "presentado",
  notas: undefined,
};

describe("computePlazoStatus", () => {
  it("reports days elapsed and remaining for a pedido within the deadline", () => {
    const pedido: PedidoRecord = { ...BASE_PEDIDO, fechaPresentado: "2026-06-01" };
    const status = computePlazoStatus(pedido, "2026-06-30");
    expect(status.businessDaysElapsed).toBe(21);
    expect(status.businessDaysRemaining).toBe(PLAZO_HABIL_DIAS - 21);
    expect(status.isOverdue).toBe(false);
    expect(status.frozen).toBe(false);
  });

  it("marks a pedido overdue once elapsed business days exceed 30", () => {
    const status = computePlazoStatus(BASE_PEDIDO, "2026-07-08");
    expect(status.businessDaysElapsed).toBe(70);
    expect(status.businessDaysRemaining).toBe(PLAZO_HABIL_DIAS - 70);
    expect(status.isOverdue).toBe(true);
  });

  it("freezes the count at fechaRespuesta for a pedido already respondido, ignoring the reference date", () => {
    const pedido: PedidoRecord = {
      ...BASE_PEDIDO,
      estado: "respondido",
      fechaRespuesta: "2026-05-15",
    };
    const status = computePlazoStatus(pedido, "2026-07-08");
    expect(status.businessDaysElapsed).toBe(32);
    expect(status.isOverdue).toBe(true);
    expect(status.frozen).toBe(true);
  });

  it("never treats a respondido pedido without fechaRespuesta as frozen (defensive fallback)", () => {
    const pedido: PedidoRecord = { ...BASE_PEDIDO, estado: "respondido" };
    const status = computePlazoStatus(pedido, "2026-07-08");
    expect(status.frozen).toBe(false);
    expect(status.businessDaysElapsed).toBe(70);
  });
});

describe("summarizePedidos", () => {
  it("classifies each pedido into responded / overdue / pending, counting the total", () => {
    const pedidos: PedidoRecord[] = [
      { ...BASE_PEDIDO, estado: "respondido", fechaRespuesta: "2026-05-15" },
      { ...BASE_PEDIDO, fechaPresentado: "2026-06-25", estado: "presentado" },
      { ...BASE_PEDIDO, fechaPresentado: "2026-04-01", estado: "vencido" },
    ];
    const summary = summarizePedidos(pedidos, "2026-07-08");
    expect(summary.total).toBe(3);
    expect(summary.respondedCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
  });

  it("returns all-zero counts for an empty list", () => {
    expect(summarizePedidos([], "2026-07-08")).toEqual({
      total: 0,
      respondedCount: 0,
      overdueCount: 0,
      pendingCount: 0,
    });
  });
});
