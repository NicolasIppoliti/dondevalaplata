import { describe, expect, it } from "vitest";
import { TITULARIDAD_ENABLED } from "@/lib/site";

/**
 * Guard test for the titularidad registral (vendor-ownership) feature flag.
 *
 * The owner parked this feature indefinitely on 2026-07-10 after trusted
 * contacts flagged real-world risk in naming private vendor owners publicly
 * (see DESIGN.md's titularidad decision entry and `lib/site.ts`). The
 * flag MUST stay `false` in the committed source so the shipped site never
 * renders a socio name -- this test exists to catch an accidental flip
 * during code review, not to test runtime behavior.
 */
describe("TITULARIDAD_ENABLED guard", () => {
  it("is false in the committed source (feature parked -- see DESIGN.md)", () => {
    expect(TITULARIDAD_ENABLED).toBe(false);
  });
});
