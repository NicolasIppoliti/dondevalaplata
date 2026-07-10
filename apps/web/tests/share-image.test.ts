import { describe, expect, it } from "vitest";
import {
  SHARE_IMAGE_FORMATS,
  SHARE_IMAGE_SIZES,
  buildShareImageOptions,
  shareImageFilename,
  shareImagePath,
  shareImageUrlFor,
} from "@/lib/shareImage";

/**
 * Feature H4 (shareable PNG images): `lib/shareImage.ts` is the single
 * source of truth for the two on-brand formats (WhatsApp square, Instagram
 * historia vertical) every share fact gets -- both the Route Handlers
 * (`app/compartir/[fact]/whatsapp/route.tsx` and `.../historia/route.tsx`)
 * and `ShareButton` read from it, so the format ids/sizes/URLs never drift.
 */
describe("SHARE_IMAGE_FORMATS / SHARE_IMAGE_SIZES", () => {
  it("defines exactly the whatsapp (square) and historia (vertical 9:16) formats with their real pixel dimensions", () => {
    expect(SHARE_IMAGE_FORMATS).toEqual(["whatsapp", "historia"]);
    expect(SHARE_IMAGE_SIZES.whatsapp).toEqual({ width: 1080, height: 1080 });
    expect(SHARE_IMAGE_SIZES.historia).toEqual({ width: 1080, height: 1920 });
  });
});

describe("shareImagePath", () => {
  it("builds the real Route Handler path for a fact+format", () => {
    expect(shareImagePath("deuda", "whatsapp")).toBe(
      "/compartir/deuda/whatsapp",
    );
  });

  it("builds a different path for a different fact+format (proves it's not hardcoded)", () => {
    expect(shareImagePath("coparticipacion", "historia")).toBe(
      "/compartir/coparticipacion/historia",
    );
  });
});

describe("shareImageUrlFor", () => {
  it("builds an absolute URL on the real production domain", () => {
    expect(shareImageUrlFor("transparencia", "whatsapp")).toBe(
      "https://dondevalaplata.fragua.dev/compartir/transparencia/whatsapp",
    );
  });
});

describe("shareImageFilename", () => {
  it("builds a stable, on-brand filename for the download/Web-Share fallback", () => {
    expect(shareImageFilename("deuda", "whatsapp")).toBe(
      "ddvlp-deuda-whatsapp.png",
    );
  });

  it("varies the filename by format (proves it's derived, not hardcoded)", () => {
    expect(shareImageFilename("deuda", "historia")).toBe(
      "ddvlp-deuda-historia.png",
    );
  });
});

describe("buildShareImageOptions", () => {
  it("builds the ShareButton `images` prop shape -- one {url, filename} per format, keyed by format", () => {
    const options = buildShareImageOptions("deuda");
    expect(options.whatsapp).toEqual({
      url: "https://dondevalaplata.fragua.dev/compartir/deuda/whatsapp",
      filename: "ddvlp-deuda-whatsapp.png",
    });
    expect(options.historia).toEqual({
      url: "https://dondevalaplata.fragua.dev/compartir/deuda/historia",
      filename: "ddvlp-deuda-historia.png",
    });
  });

  it("varies by fact id (proves it's derived per-fact, not hardcoded)", () => {
    const options = buildShareImageOptions("coparticipacion");
    expect(options.whatsapp.url).toBe(
      "https://dondevalaplata.fragua.dev/compartir/coparticipacion/whatsapp",
    );
  });
});
