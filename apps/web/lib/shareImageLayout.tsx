import type { ShareFact } from "./shareFacts";
import type { ShareImageFormat } from "./shareImage";
import { SITE_HOST } from "./site";

/**
 * Feature H4 (shareable PNG images): the shared on-brand card renderer for
 * the two shareable formats ("whatsapp" 1080x1080 square, "historia"
 * 1080x1920 vertical -- see `lib/shareImage.ts`). Both
 * `app/compartir/[fact]/whatsapp/route.tsx` and `.../historia/route.tsx`
 * render THIS same component so the two formats never drift content-wise --
 * only the layout (square vs. vertical, safe margins) differs by `format`.
 * El Recibo palette (DESIGN.md) + the same 3 vendored brand fonts
 * (Fraunces, Spline Sans Mono, Instrument Sans) as the sibling
 * `opengraph-image.tsx`.
 *
 * Satori (the engine behind `next/og`'s `ImageResponse`) requires an
 * explicit `display: "flex"` on ANY `<div>` with more than one child -- a
 * real bug hit and fixed while building `opengraph-image.tsx` (see that
 * file's comment) -- every multi-child node below sets it explicitly.
 */

const PAPER = "#F2EFE4";
const INK = "#1A1A17";
const MUTED = "#6B6558";
const STAMP = "#C4361E";
const RULE = "#D8D2C0";

interface ShareImageCardProps {
  fact: ShareFact;
  format: ShareImageFormat;
}

export function ShareImageCard({ fact, format }: ShareImageCardProps) {
  const isStory = format === "historia";

  // Instagram Stories safe area: the top ~250px is covered by the
  // profile/timestamp chrome and the bottom ~250px by the reply bar --
  // both requested to stay clear so the fact is never obstructed by
  // Instagram's own UI. The square WhatsApp format has no such constraint,
  // so it keeps a normal padding.
  const verticalPadding = isStory ? 264 : 80;
  const horizontalPadding = isStory ? 88 : 80;
  const align = isStory ? "center" : "flex-start";
  const textAlign = isStory ? ("center" as const) : ("left" as const);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAPER,
        padding: `${verticalPadding}px ${horizontalPadding}px`,
        fontFamily: "Instrument Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align,
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: INK,
              color: PAPER,
              fontFamily: "Spline Sans Mono",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            $
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: INK }}>
              ¿Dónde va la plata?
            </div>
            <div
              style={{
                fontFamily: "Spline Sans Mono",
                fontSize: 17,
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
            fontSize: 20,
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
          alignItems: align,
          textAlign,
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 700,
            fontSize: isStory ? 62 : 56,
            lineHeight: 1.15,
            color: INK,
            maxWidth: isStory ? 820 : 880,
          }}
        >
          {fact.headline}
        </div>
        <div
          style={{
            fontFamily: "Spline Sans Mono",
            fontWeight: 700,
            fontSize: isStory ? 152 : 172,
            lineHeight: 1,
            color: STAMP,
            marginTop: 28,
          }}
        >
          {fact.value}
        </div>
        <div
          style={{
            fontSize: isStory ? 30 : 27,
            color: INK,
            marginTop: 24,
            maxWidth: isStory ? 780 : 860,
          }}
        >
          {fact.caption}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align,
          gap: 12,
          borderTop: `2px solid ${RULE}`,
          paddingTop: 24,
          marginTop: 20,
        }}
      >
        <div
          style={{
            fontFamily: "Spline Sans Mono",
            fontSize: 20,
            color: MUTED,
            maxWidth: isStory ? 820 : 900,
            textAlign,
          }}
        >
          {`Fuente: ${fact.sourceLabel}`}
        </div>
        <div
          style={{
            fontFamily: "Spline Sans Mono",
            fontSize: 22,
            fontWeight: 700,
            color: INK,
          }}
        >
          {SITE_HOST}
        </div>
      </div>
    </div>
  );
}
