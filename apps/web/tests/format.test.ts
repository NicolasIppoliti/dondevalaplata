import { describe, expect, it } from "vitest";
import {
  formatArsCompact,
  formatArsHuman,
  formatArsPlain,
  formatDateEsAr,
  formatDateShortEsAr,
  formatFineArs,
  formatPeriodEsAr,
  formatVariationEsAr,
  splitArsUnit,
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

describe("formatArsHuman", () => {
  // Headline/table figures round to ~3 significant figures and always say
  // "millones" -- never "mil millones" -- so a non-technical reader can
  // read the number at a glance instead of parsing a decimal comma.
  // "$ 1,75 mil millones" (formatArsCompact) is exactly the confusing form
  // this function replaces for headline display.
  it("rounds a billion-plus figure to 'X.XXX millones', never 'mil millones'", () => {
    expect(formatArsHuman(1_753_712_237.66)).toBe("$ 1.750 millones");
  });

  it("rounds a sub-billion figure to whole millones", () => {
    expect(formatArsHuman(716_801_481)).toBe("$ 717 millones");
  });

  it("falls back to exact plain formatting under one million", () => {
    expect(formatArsHuman(300_000)).toBe("$ 300.000");
  });

  it("handles a negative amount with the sign in front of the $ sign", () => {
    expect(formatArsHuman(-1_753_712_237.66)).toBe("-$ 1.750 millones");
  });

  it("never claims more precision than 3 significant figures", () => {
    // 6.751.250.530 -> 6751,25 millones -> 3 sig figs -> 6.750 millones.
    expect(formatArsHuman(6_751_250_530)).toBe("$ 6.750 millones");
  });
});

describe("splitArsUnit", () => {
  // The home hero figure card (fidelity slice F1) renders the "millones"/
  // "mil millones" unit word at a visually smaller scale beside the amount
  // -- this pure helper splits `formatArsHuman`'s output for that purpose
  // WITHOUT re-deriving the number, so the split value can never drift from
  // the exact figure `formatArsHuman` already produced.
  it("splits a 'millones' figure into amount + unit", () => {
    expect(splitArsUnit("$ 1.750 millones")).toEqual({
      amount: "$ 1.750",
      unit: "millones",
    });
  });

  it("splits a 'mil millones' figure into amount + unit", () => {
    expect(splitArsUnit("$ 6,75 mil millones")).toEqual({
      amount: "$ 6,75",
      unit: "mil millones",
    });
  });

  it("returns the whole string with a null unit below the million threshold", () => {
    expect(splitArsUnit("$ 300.000")).toEqual({
      amount: "$ 300.000",
      unit: null,
    });
  });

  it("preserves a negative sign in the amount part", () => {
    expect(splitArsUnit("-$ 1.750 millones")).toEqual({
      amount: "-$ 1.750",
      unit: "millones",
    });
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

describe("formatDateShortEsAr", () => {
  it("renders an ISO date as compact 'DD/MM/AAAA'", () => {
    expect(formatDateShortEsAr("2024-03-14")).toBe("14/03/2024");
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

describe("formatVariationEsAr", () => {
  it("formats a positive fraction with an explicit '+' sign and comma decimal", () => {
    expect(formatVariationEsAr(0.032)).toBe("+3,2%");
  });

  it("formats a negative fraction with a true minus sign (U+2212), not a hyphen", () => {
    expect(formatVariationEsAr(-0.057)).toBe("−5,7%");
  });

  it("treats zero as non-negative (explicit '+' sign, never a bare '0%')", () => {
    expect(formatVariationEsAr(0)).toBe("+0,0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatVariationEsAr(0.01149)).toBe("+1,1%");
  });
});
