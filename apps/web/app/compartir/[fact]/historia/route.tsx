import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SHARE_FACT_IDS, getShareFact } from "@/lib/shareFacts";
import { SHARE_IMAGE_SIZES } from "@/lib/shareImage";
import { ShareImageCard } from "@/lib/shareImageLayout";

/**
 * Feature H4 (shareable PNG images, Instagram Stories format): a real,
 * static `/compartir/[fact]/historia` PNG per fact -- 1080x1920 (9:16),
 * vertical, with generous top/bottom safe margins so Instagram's own UI
 * (profile/timestamp chrome, reply bar) never covers the fact -- so the
 * enhanced `ShareButton` can hand a visitor the FACT ITSELF as an image.
 * HONESTY: there is no web API to post directly to an Instagram story --
 * this PNG is shared via the OS share sheet (or downloaded) and the visitor
 * posts it themselves; `ShareButton` sets that expectation explicitly, this
 * route never implies auto-posting. `generateStaticParams` +
 * `dynamicParams = false` mean this Route Handler is statically generated
 * ONCE per fact at `next build` -- same build-time-only doctrine as the
 * sibling `opengraph-image.tsx` and the `whatsapp` format above.
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
    throw new Error(`compartir/historia image: unknown fact id "${factId}"`);
  }

  const [fraunces, splineSansMono, instrumentSans] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/SplineSansMono-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSans-SemiBold.woff")),
  ]);

  return new ImageResponse(<ShareImageCard fact={fact} format="historia" />, {
    ...SHARE_IMAGE_SIZES.historia,
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
