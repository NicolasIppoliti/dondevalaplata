"use client";

import { type MouseEvent, useCallback, useState } from "react";
import type { ShareImageFormat } from "@/lib/shareImage";

interface ShareImageOption {
  /** Absolute URL of the static PNG (`lib/shareImage.ts#shareImageUrlFor`). */
  url: string;
  /** Suggested filename for the download / Web Share `File`. */
  filename: string;
}

interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
  className?: string;
  /**
   * Feature H4 (shareable PNG images): when provided, renders one
   * always-visible action per format so a visitor can get the FACT ITSELF
   * as an image -- "hand over the image, site optional". Built by the
   * caller from `lib/shareImage.ts` (`shareImageUrlFor` /
   * `shareImageFilename`) so this component never needs to know about
   * `ShareFact` internals.
   */
  images?: Record<ShareImageFormat, ShareImageOption>;
}

const IMAGE_ACTION_LABELS: Record<ShareImageFormat, string> = {
  whatsapp: "Imagen para WhatsApp",
  historia: "Imagen para historia de Instagram",
};

/**
 * One-tap SHARE (feature H3b): `navigator.share` (Web Share API) on
 * mobile -- the native share sheet, WhatsApp included -- falling back on
 * desktop (or any browser without the API) to a small inline menu with a
 * direct WhatsApp intent link (`wa.me`) and a "copiar enlace" clipboard
 * action. No backend, no tracking: every action is a client-only browser
 * API call, same doctrine as `PedidoGenerator`'s copy/download actions.
 *
 * `url` always points to the relevant page (or a `/compartir/[fact]`
 * route carrying the on-brand OG image), never a tracking redirect.
 *
 * Feature H4 image actions (when `images` is passed): each is a real
 * `a[download]` link FIRST (works with JS disabled, always keyboard/screen
 * reader operable), progressively enhanced on click -- if the Web Share
 * API level 2 (`navigator.canShare({ files })`) is available and accepts
 * the fetched PNG as a `File`, the native OS share sheet opens with the
 * IMAGE attached (WhatsApp/Instagram/etc. straight from the sheet, no site
 * visit required); otherwise the click falls through to the plain
 * download. `preventDefault()` MUST run synchronously (before the async
 * `fetch`) or the browser's native download already started by the time
 * the share decision is known -- hence the "prevent now, manually
 * re-trigger the download later if share isn't used" shape below.
 */
export function ShareButton({
  url,
  title,
  text,
  className = "",
  images,
}: ShareButtonProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled the native share sheet, or it's unsupported for
        // this payload -- fall through to the inline menu below.
      }
    }
    setShowFallback((prev) => !prev);
  }, [title, text, url]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const handleImageClick = useCallback(
    (option: ShareImageOption) =>
      async (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          typeof navigator === "undefined" ||
          typeof navigator.canShare !== "function"
        ) {
          // Web Share (files) unsupported -- let the native `a[download]`
          // proceed as-is.
          return;
        }
        // Must run BEFORE the `await` below: once this handler yields,
        // the browser may already have started the native download.
        event.preventDefault();
        try {
          const response = await fetch(option.url);
          const blob = await response.blob();
          const file = new File([blob], option.filename, {
            type: "image/png",
          });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text, url });
            return;
          }
        } catch {
          // Fetch failed, or the user cancelled the native share sheet --
          // fall through to a manual download below.
        }
        const fallbackLink = document.createElement("a");
        fallbackLink.href = option.url;
        fallbackLink.download = option.filename;
        fallbackLink.click();
      },
    [text, url],
  );

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <div className={`flex flex-wrap items-start gap-2 ${className}`}>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={handleShare}
          aria-expanded={showFallback}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border-2 border-ink bg-ink px-4 font-sans text-sm font-semibold text-surface no-underline transition-colors hover:border-stamp hover:bg-stamp"
        >
          <span aria-hidden="true">↗</span> Compartir
        </button>
        {showFallback ? (
          <div className="absolute z-10 mt-2 flex min-w-[220px] flex-col gap-1 rounded-md border border-rule bg-surface p-2 shadow-card">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-sm px-3 font-sans text-sm text-ink no-underline hover:bg-surface-2"
            >
              Compartir por WhatsApp
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 items-center rounded-sm px-3 text-left font-sans text-sm text-ink hover:bg-surface-2"
            >
              {copied ? "Enlace copiado ✓" : "Copiar enlace"}
            </button>
          </div>
        ) : null}
      </div>

      {images ? (
        <>
          <a
            href={images.whatsapp.url}
            download={images.whatsapp.filename}
            onClick={handleImageClick(images.whatsapp)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border-2 border-ink px-4 font-sans text-sm font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface"
          >
            {IMAGE_ACTION_LABELS.whatsapp}
          </a>
          <div className="flex flex-col gap-1">
            <a
              href={images.historia.url}
              download={images.historia.filename}
              onClick={handleImageClick(images.historia)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border-2 border-ink px-4 font-sans text-sm font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface"
            >
              {IMAGE_ACTION_LABELS.historia}
            </a>
            <p className="max-w-[32ch] font-sans text-xs text-muted">
              No hay forma de publicarla directo en tu historia — se
              descarga/comparte la imagen y la subís vos desde Instagram.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
