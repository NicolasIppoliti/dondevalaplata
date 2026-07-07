import { describe, expect, it } from "vitest";
import {
  formatArsCompact,
  formatArsPlain,
  formatDateEsAr,
  formatFineArs,
  formatPeriodEsAr,
} from "@/lib/format";

describe("formatArsPlain", () => {
  it("formats a whole-peso amount with es-AR thousands separators", () => {
    expect(formatArsPlain(1716801481)).toBe("$ 1.716.801.481");
  });

  it("rounds to the nearest peso", () => {
    expect(formatArsPlain(1753712237.66)).toBe("$ 1.753.712.238");
  });
});

describe("formatArsCompact", () => {
  it("expresses billions as 'mil millones' with a comma decimal", () => {
    expect(formatArsCompact(6_751_250_530)).toBe("$ 6,75 mil millones");
  });

  it("expresses millions as 'millones' with a comma decimal", () => {
    expect(formatArsCompact(716_801_481)).toBe("$ 716,80 millones");
  });

  it("falls back to plain formatting under one million", () => {
    expect(formatArsCompact(300_000)).toBe("$ 300.000");
  });
});

describe("formatPeriodEsAr", () => {
  it("renders a YYYY-MM period as 'mes de aaaa' in lowercase Spanish", () => {
    expect(formatPeriodEsAr("2026-04")).toBe("abril de 2026");
  });
});

describe("formatDateEsAr", () => {
  it("renders an ISO date as 'D de mes de aaaa'", () => {
    expect(formatDateEsAr("2024-03-14")).toBe("14 de marzo de 2024");
  });
});

describe("formatFineArs", () => {
  it("formats a real monetary fine using the compact ARS convention", () => {
    expect(formatFineArs(300_000)).toBe("$ 300.000");
  });

  it("renders an explicit es-AR marker for a null fine, never a fabricated $ 0", () => {
    // Bug: `fineArs ?? 0` previously rendered a null (no monetary fine
    // reported) exactly like a real $ 0, which is factually misleading.
    expect(formatFineArs(null)).toBe("sin multa monetaria");
  });

  it("still distinguishes a genuine zero fine from a null (no-fine) record", () => {
    expect(formatFineArs(0)).toBe("$ 0");
    expect(formatFineArs(0)).not.toBe(formatFineArs(null));
  });
});
