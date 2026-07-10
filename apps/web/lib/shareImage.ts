import type { ShareFactId } from "./shareFacts";
import { SITE_URL } from "./site";

/**
 * Feature H4 (shareable PNG images): the two on-brand image formats every
 * share fact gets, each a real static PNG built at `next build` time via a
 * Route Handler (`app/compartir/[fact]/whatsapp/route.tsx` and
 * `.../historia/route.tsx`) -- "whatsapp" (square, feed/chat-friendly) and
 * "historia" (vertical 9:16, Instagram Stories safe-area). Single source of
 * truth for format ids, pixel sizes, and the URL/filename the enhanced
 * `ShareButton` fetches/downloads, so the two never drift out of sync.
 */
export const SHARE_IMAGE_FORMATS = ["whatsapp", "historia"] as const;
export type ShareImageFormat = (typeof SHARE_IMAGE_FORMATS)[number];

export interface ShareImageSize {
  width: number;
  height: number;
}

export const SHARE_IMAGE_SIZES: Record<ShareImageFormat, ShareImageSize> = {
  whatsapp: { width: 1080, height: 1080 },
  historia: { width: 1080, height: 1920 },
};

/** Relative `/compartir/[id]/[format]` path -- the literal Route Handler URL. */
export function shareImagePath(
  factId: ShareFactId,
  format: ShareImageFormat,
): string {
  return `/compartir/${factId}/${format}`;
}

/** Absolute URL on the real production domain, for `fetch()` / Web Share. */
export function shareImageUrlFor(
  factId: ShareFactId,
  format: ShareImageFormat,
): string {
  return `${SITE_URL}${shareImagePath(factId, format)}`;
}

/** Stable, on-brand filename per fact+format for the `a[download]` fallback
 * and the `File` object handed to `navigator.share`. */
export function shareImageFilename(
  factId: ShareFactId,
  format: ShareImageFormat,
): string {
  return `ddvlp-${factId}-${format}.png`;
}

export interface ShareImageOption {
  url: string;
  filename: string;
}

/** Builds the exact `images` prop shape `ShareButton` expects (feature
 * H4) -- one `{url, filename}` per format, keyed by format -- so every
 * call site (`CompartirFactView`, `/transparencia`, `/coparticipacion`)
 * derives it the same way instead of hand-rolling the object. */
export function buildShareImageOptions(
  factId: ShareFactId,
): Record<ShareImageFormat, ShareImageOption> {
  return Object.fromEntries(
    SHARE_IMAGE_FORMATS.map((format) => [
      format,
      {
        url: shareImageUrlFor(factId, format),
        filename: shareImageFilename(factId, format),
      },
    ]),
  ) as Record<ShareImageFormat, ShareImageOption>;
}
