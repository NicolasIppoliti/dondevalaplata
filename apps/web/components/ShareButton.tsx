"use client";

import { useCallback, useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
  className?: string;
}

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
 */
export function ShareButton({
  url,
  title,
  text,
  className = "",
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

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <div className={`relative inline-block ${className}`}>
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
  );
}
