import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/ShareButton";
import { SourcesFooter } from "@/components/SourcesFooter";
import { getShareFact, shareTextFor, shareUrlFor } from "@/lib/shareFacts";
import { getPortalData, resolveSourceRefs } from "@/lib/sources";

/**
 * Feature H3b (share cards): the "carrier" page a shared link points to —
 * its `opengraph-image.tsx` sibling (feature H3b) is what makes the
 * WhatsApp/social preview show the on-brand card instead of a generic
 * page snippet. The page itself restates the SAME fact in plain HTML (so
 * it stays useful for a visitor who taps through, or for a crawler that
 * doesn't render the OG image), cites full dual-link + sha256 provenance
 * (INVIOLABLE #2 — every headline figure carries it), and links back to
 * the fact's full page on the site.
 *
 * Kept as a plain, synchronous, presentational component (container/
 * presentational split, same pattern as `FalloEjercicioView`) so it can be
 * unit-tested directly, independent of the async `params` Promise the real
 * `app/compartir/[fact]/page.tsx` route must await per Next.js 16.
 */
interface CompartirFactViewProps {
  factId: string;
}

export function CompartirFactView({ factId }: CompartirFactViewProps) {
  const fact = getShareFact(factId);
  if (!fact) {
    notFound();
  }

  const { manifest } = getPortalData();
  const sourceLinks = resolveSourceRefs(fact.sourceRefs, manifest);
  const shareUrl = shareUrlFor(fact);
  const shareText = shareTextFor(fact);

  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-xs font-semibold tracking-[0.1em] text-stamp uppercase">
          {fact.kicker}
        </p>
        <h1 className="mt-2 font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          {fact.headline}
        </h1>
        <p className="mt-4 font-mono text-[clamp(40px,10vw,72px)] leading-none font-semibold text-ink tabular-nums">
          {fact.value}
        </p>
        <p className="mt-4 max-w-[62ch] text-ink">{fact.caption}</p>
        <p className="mt-2 font-mono text-xs text-muted">
          dondevalaplata.vercel.app · {fact.sourceLabel}
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <ShareButton url={shareUrl} title={fact.headline} text={shareText} />
        <Link
          href={fact.pageHref}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border-2 border-ink px-4 font-sans text-sm font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface"
        >
          Ver la página completa <span aria-hidden="true">→</span>
        </Link>
      </section>

      <SourcesFooter links={sourceLinks} />
    </div>
  );
}
