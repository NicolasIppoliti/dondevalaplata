import { describe, expect, it } from "vitest";
import {
  SHARE_FACT_IDS,
  getShareFact,
  getShareFacts,
  isShareFactId,
  shareTextFor,
  shareUrlFor,
} from "@/lib/shareFacts";
import { getPortalData } from "@/lib/sources";

/**
 * Feature H3b (share cards): `lib/shareFacts.ts` derives the small,
 * curated set of "sharp facts" from the ALREADY-BUILT `data/*.json` (never
 * a new fetch, never `Date.now()`) -- same build-time-only doctrine as
 * every other figure on the portal.
 */
describe("SHARE_FACT_IDS / isShareFactId", () => {
  it("lists exactly the three facts the task specifies", () => {
    expect(SHARE_FACT_IDS).toEqual(["deuda", "transparencia", "coparticipacion"]);
  });

  it("isShareFactId accepts only known ids", () => {
    expect(isShareFactId("deuda")).toBe(true);
    expect(isShareFactId("no-existe")).toBe(false);
  });
});

describe("getShareFacts", () => {
  it("returns one fact per id, each carrying a headline, value, caption, page link and sourceRefs (INVIOLABLE #2: every headline figure carries provenance)", () => {
    const facts = getShareFacts();
    expect(facts.map((f) => f.id)).toEqual(SHARE_FACT_IDS);
    for (const fact of facts) {
      expect(fact.headline.length).toBeGreaterThan(0);
      expect(fact.value.length).toBeGreaterThan(0);
      expect(fact.caption.length).toBeGreaterThan(0);
      expect(fact.pageHref.startsWith("/")).toBe(true);
      expect(fact.sourceRefs.length).toBeGreaterThan(0);
    }
  });

  it("every fact's sourceRefs resolve against the real archive-manifest.json", () => {
    const { manifest } = getPortalData();
    const knownIds = new Set(manifest.map((record) => record.id));
    const facts = getShareFacts();
    for (const fact of facts) {
      for (const id of fact.sourceRefs) {
        expect(knownIds.has(id)).toBe(true);
      }
    }
  });

  it("the deuda fact states the real elapsedDays from data/cadencia.json, never a hardcoded number", () => {
    const { cadencia } = getPortalData();
    const facts = getShareFacts();
    const deuda = facts.find((f) => f.id === "deuda");
    expect(deuda?.value).toBe(String(cadencia.deuda.elapsedDays));
    expect(deuda?.headline).toContain(String(cadencia.deuda.elapsedDays));
  });

  it("the transparencia fact states the real ASAP total/max from data/transparencia.json", () => {
    const { transparencia } = getPortalData();
    const facts = getShareFacts();
    const transparenciaFact = facts.find((f) => f.id === "transparencia");
    expect(transparenciaFact?.value).toBe(
      `${transparencia.total}/${transparencia.max}`,
    );
  });

  it("the coparticipacion fact states Coronel Rosales's real latest month, sourced from data/coparticipacion.json", () => {
    const { coparticipacion } = getPortalData();
    const coronelRosales = coparticipacion.series.find(
      (s) => s.municipioId === "06182",
    );
    const lastPoint = coronelRosales?.points[coronelRosales.points.length - 1];
    const facts = getShareFacts();
    const coparticipacionFact = facts.find((f) => f.id === "coparticipacion");
    expect(coparticipacionFact?.headline).toContain(
      String(lastPoint?.period.split("-")[0]),
    );
  });
});

describe("shareUrlFor / shareTextFor", () => {
  it("builds an absolute /compartir/[id] URL on the real production domain", () => {
    const fact = getShareFact("deuda");
    expect(shareUrlFor(fact!)).toBe(
      "https://dondevalaplata.fragua.dev/compartir/deuda",
    );
  });

  it("builds share text stating the headline and the site URL", () => {
    const fact = getShareFact("transparencia");
    const text = shareTextFor(fact!);
    expect(text).toContain(fact!.headline);
    expect(text).toContain("dondevalaplata.fragua.dev");
  });
});

describe("getShareFact", () => {
  it("resolves a single fact by id", () => {
    const fact = getShareFact("transparencia");
    expect(fact?.id).toBe("transparencia");
  });

  it("returns undefined for an unknown id", () => {
    expect(getShareFact("no-existe")).toBeUndefined();
  });
});
