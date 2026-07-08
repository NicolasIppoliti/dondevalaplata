import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SHARE_FACT_IDS, getShareFact } from "@/lib/shareFacts";

/**
 * Feature H3b (share cards): a static, build-time-generated Open Graph
 * image per fact -- what makes a shared `/compartir/[fact]` link show an
 * on-brand card (not a generic page snippet) in the WhatsApp/social link
 * preview. `dynamicParams = false` + `generateStaticParams` below mean
 * this renders exactly 3 times, once per fact, at `next build` -- no
 * request-time API is used, so Next statically optimizes and caches every
 * image (see the file-convention docs: "generated images are statically
 * optimized unless they use Request-time APIs"). No backend, no tracking.
 *
 * Fonts: the project's actual brand fonts (Fraunces, Spline Sans Mono,
 * Instrument Sans -- DESIGN.md typography table) are vendored as static
 * `.woff` files under `assets/fonts/` (`next/font/google`'s own hosted
 * files aren't reachable by filesystem path, and `ImageResponse`/Satori
 * only accepts raw font bytes, not a React font-loader object) --
 * `ImageResponse` only supports `ttf`/`otf`/`woff`, not `woff2`, so each
 * file here was fetched as the legacy static-weight `woff` variant
 * Google's font CDN still serves.
 */

export const alt = "¿Dónde va la plata? — Coronel Rosales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return SHARE_FACT_IDS.map((fact) => ({ fact }));
}

const PAPER = "#F2EFE4";
const INK = "#1A1A17";
const MUTED = "#6B6558";
const STAMP = "#C4361E";
const RULE = "#D8D2C0";

export default async function Image({
  params,
}: {
  params: Promise<{ fact: string }>;
}) {
  const { fact: factId } = await params;
  const fact = getShareFact(factId);
  if (!fact) {
    throw new Error(`compartir opengraph-image: unknown fact id "${factId}"`);
  }

  const [fraunces, splineSansMono, instrumentSans] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/SplineSansMono-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSans-SemiBold.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          padding: "56px 64px",
          fontFamily: "Instrument Sans",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: INK,
                color: PAPER,
                fontFamily: "Spline Sans Mono",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              $
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: INK }}>
                ¿Dónde va la plata?
              </div>
              <div
                style={{
                  fontFamily: "Spline Sans Mono",
                  fontSize: 15,
                  color: MUTED,
                }}
              >
                Coronel Rosales · Punta Alta
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 16,
              fontWeight: 700,
              color: STAMP,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {fact.kicker}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces",
              fontWeight: 700,
              fontSize: 46,
              lineHeight: 1.15,
              color: INK,
              maxWidth: 1020,
            }}
          >
            {fact.headline}
          </div>
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontWeight: 700,
              fontSize: 104,
              lineHeight: 1,
              color: STAMP,
              marginTop: 22,
            }}
          >
            {fact.value}
          </div>
          <div style={{ fontSize: 24, color: INK, marginTop: 20, maxWidth: 940 }}>
            {fact.caption}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${RULE}`,
            paddingTop: 20,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 16,
              color: MUTED,
              maxWidth: 760,
            }}
          >
            {`Fuente: ${fact.sourceLabel}`}
          </div>
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 18,
              fontWeight: 700,
              color: INK,
            }}
          >
            dondevalaplata.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 700, style: "normal" },
        {
          name: "Spline Sans Mono",
          data: splineSansMono,
          weight: 700,
          style: "normal",
        },
        {
          name: "Instrument Sans",
          data: instrumentSans,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
