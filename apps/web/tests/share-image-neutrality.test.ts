import { describe, expect, it } from "vitest";
import { SHARE_FACT_IDS, getShareFacts } from "@/lib/shareFacts";

/**
 * Guard test for feature H4 (shareable PNG images): every WhatsApp/historia
 * PNG (`app/compartir/[fact]/whatsapp/route.tsx`,
 * `.../historia/route.tsx`) and the existing `opengraph-image.tsx` render
 * `ShareFact` fields VERBATIM (kicker/headline/value/caption/sourceLabel) --
 * see `lib/shareImageLayout.tsx`. This test asserts none of those fields, or
 * the set of known fact ids, ever mentions titularidad/socio content, so a
 * future addition to `lib/shareFacts.ts` can't accidentally leak the parked
 * titularidad registral (vendor-ownership) feature into a shared image. Same
 * doctrine as `tests/titularidad-flag.test.ts` (owner parked this feature
 * 2026-07-10, see DESIGN.md) -- a data guard, not a runtime-behavior test.
 */
const FORBIDDEN_PATTERN = /titularidad|socio/i;

describe("Share image neutrality guard (no titularidad/socio content in any share image)", () => {
  it("SHARE_FACT_IDS never includes a titularidad-related fact", () => {
    expect(SHARE_FACT_IDS.some((id) => FORBIDDEN_PATTERN.test(id))).toBe(
      false,
    );
  });

  it("no fact's rendered text fields mention titularidad/socio (every share image renders these fields verbatim)", () => {
    const facts = getShareFacts();
    expect(facts.length).toBe(3);
    for (const fact of facts) {
      const renderedText = [
        fact.kicker,
        fact.headline,
        fact.value,
        fact.caption,
        fact.sourceLabel,
      ].join(" ");
      expect(FORBIDDEN_PATTERN.test(renderedText)).toBe(false);
    }
  });
});
