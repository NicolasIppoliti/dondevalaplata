import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SHARE_FACT_IDS, getShareFact } from "@/lib/shareFacts";
import { SHARE_IMAGE_SIZES } from "@/lib/shareImage";
import { ShareImageCard } from "@/lib/shareImageLayout";

/**
 * Feature H4 (shareable PNG images, WhatsApp/feed format): a real, static
 * `/compartir/[fact]/whatsapp` PNG per fact -- 1080x1080, square -- so the
 * enhanced `ShareButton` can hand a visitor the FACT ITSELF as an image
 * (Web Share API `files`, or a plain download), without them ever needing
 * to open the site. `generateStaticParams` + `dynamicParams = false` mean
 * this Route Handler is statically generated ONCE per fact at `next build`
 * -- same build-time-only doctrine as the sibling `opengraph-image.tsx`
 * (no Request-time API is used, so Next statically optimizes and caches
 * every image). No backend, no tracking.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SHARE_FACT_IDS.map((fact) => ({ fact }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fact: string }> },
) {
  const { fact: factId } = await params;
  const fact = getShareFact(factId);
  if (!fact) {
    throw new Error(`compartir/whatsapp image: unknown fact id "${factId}"`);
  }

  const [fraunces, splineSansMono, instrumentSans] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/SplineSansMono-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSans-SemiBold.woff")),
  ]);

  return new ImageResponse(<ShareImageCard fact={fact} format="whatsapp" />, {
    ...SHARE_IMAGE_SIZES.whatsapp,
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
  });
}
